"""
Payments Models — VehicleSettlement
Monthly closing document per vehicle. Replaces the old Payment model.
FastagRecord (in expenses app) is completely independent — no FK between them.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone


class VehicleSettlement(models.Model):
    """
    Monthly financial settlement for a vehicle.
    Coordinator fills manual inputs; calculate() aggregates expenses and computes balances.
    mark_paid() auto-carries the unpaid remainder to the next month's record.
    """

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('finalized', 'Finalized'),
        ('paid', 'Paid'),
    ]

    BILLING_MODE_CHOICES = [
        ('full_month', 'Full Month Rate'),
        ('daily_rate', 'Daily Rate'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('full', 'Full'),
        ('overpaid', 'Overpaid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='settlements',
    )
    month_year = models.DateField()

    # ── Manual inputs ──────────────────────────────────────────────────────────
    total_days = models.IntegerField(default=0)
    working_days = models.IntegerField(default=0)
    working_days_manual = models.BooleanField(default=False)
    total_km = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_km_manual = models.BooleanField(default=False)
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    absent_penalty_days = models.IntegerField(default=0)
    absent_penalty_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Billing formula selection
    billing_mode = models.CharField(
        max_length=20,
        choices=BILLING_MODE_CHOICES,
        default='full_month',
    )

    # Extra KM billing — user inputs
    km_slab = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    extra_km_units = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    extra_km_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    extra_km_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ── System-computed ────────────────────────────────────────────────────────
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rent_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_expenses = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Legacy carry-forward field — kept for backward compat; superseded by pending/overpaid below
    carry_forward_from_previous = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_payable = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Carry-forward — two separate directions
    pending_prev_month = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overpaid_prev_month = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ── Payment ────────────────────────────────────────────────────────────────
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settlements_paid',
    )
    payment_mode = models.CharField(max_length=20, blank=True)
    transaction_reference = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='unpaid',
    )

    # ── Audit ──────────────────────────────────────────────────────────────────
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settlements_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vehicle_settlements'
        unique_together = ['vehicle', 'month_year']
        ordering = ['-month_year', '-created_at']
        verbose_name = 'Vehicle Settlement'
        verbose_name_plural = 'Vehicle Settlements'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['month_year']),
        ]

    def __str__(self):
        return f"Settlement {self.vehicle} — {self.month_year.strftime('%B %Y')} ({self.status})"

    def calculate(self):
        """
        Aggregate total_expenses from Expense table and recompute all derived fields.
        billing_mode controls whether rent is full base_amount or prorated by working_days.
        fastag_recharge rows ARE included in total_expenses (real money JJR paid out).
        """
        from apps.expenses.models import Expense
        from django.db.models import Sum

        # Step 1: daily_rate
        if self.total_days and self.total_days > 0:
            self.daily_rate = (
                Decimal(str(self.base_amount)) /
                Decimal(str(self.total_days))
            ).quantize(Decimal('0.01'))
        else:
            self.daily_rate = Decimal('0')

        # Step 2: rent_total based on billing_mode
        if self.billing_mode == 'full_month':
            self.rent_total = Decimal(str(self.base_amount))
        else:
            self.rent_total = (
                Decimal(str(self.working_days)) *
                self.daily_rate
            ).quantize(Decimal('0.01'))

        # Step 3: extra KM (units × rate — both user inputs)
        self.extra_km_amount = (
            Decimal(str(self.extra_km_units)) *
            Decimal(str(self.extra_km_rate))
        ).quantize(Decimal('0.01'))

        # Step 4: gross (rent + extra KM)
        self.gross_amount = (
            self.rent_total + self.extra_km_amount
        ).quantize(Decimal('0.01'))

        # Step 5: total expenses (all money JJR already paid out for this vehicle+month)
        self.total_expenses = (
            Expense.objects
            .filter(vehicle=self.vehicle, month_year=self.month_year)
            .aggregate(total=Sum('amount'))['total'] or Decimal('0')
        )

        # Step 6: final balance
        # + pending_prev_month  → JJR still owes from last month
        # - overpaid_prev_month → JJR overpaid last month (vehicle owner owes back)
        # - absent_penalty_amount
        # - total_expenses      → money already paid this month
        self.balance_payable = (
            self.gross_amount
            + Decimal(str(self.pending_prev_month))
            - Decimal(str(self.overpaid_prev_month))
            - Decimal(str(self.absent_penalty_amount))
            - Decimal(str(self.total_expenses))
        ).quantize(Decimal('0.01'))

        self.save()
        return self

    def recalculate_from_trips(self):
        """
        Auto-pulls working_days and total_km from APPROVED trips
        for this vehicle in this month_year. Does NOT overwrite
        fields that have manual_override=True.
        """
        from apps.trips.models import Trip
        import calendar

        trips = Trip.objects.filter(
            vehicle=self.vehicle,
            trip_date__year=self.month_year.year,
            trip_date__month=self.month_year.month,
            status='approved',
        )

        _, last_day = calendar.monthrange(self.month_year.year, self.month_year.month)
        self.total_days = last_day

        if not self.working_days_manual:
            self.working_days = trips.values('trip_date').distinct().count()

        if not self.total_km_manual:
            from django.db.models import Sum
            result = trips.aggregate(total=Sum('total_km'))
            self.total_km = result['total'] or 0

        self.save(update_fields=['total_days', 'working_days', 'total_km', 'updated_at'])

        return {
            'total_days': self.total_days,
            'working_days': self.working_days,
            'total_km': float(self.total_km),
            'trip_count': trips.count(),
        }

    def mark_paid(self, paid_by_user, paid_amount,
                  payment_mode='', transaction_reference=''):
        paid_amount = Decimal(str(paid_amount))

        self.paid_amount = paid_amount
        self.paid_at = timezone.now()
        self.paid_by = paid_by_user
        self.payment_mode = payment_mode
        self.transaction_reference = transaction_reference
        self.status = 'paid'

        diff = self.balance_payable - paid_amount

        if diff == 0:
            self.payment_status = 'full'
        elif diff > 0:
            self.payment_status = 'partial'   # paid less than owed
        else:
            self.payment_status = 'overpaid'  # paid more than owed

        self.save()

        # Push carry-forward to next month
        next_month = self._next_month()
        next_settlement, created = VehicleSettlement.objects.get_or_create(
            vehicle=self.vehicle,
            month_year=next_month,
            defaults={'status': 'draft'},
        )

        if diff > 0:
            # JJR paid less — next month pending = remaining owed
            next_settlement.pending_prev_month = diff
            next_settlement.overpaid_prev_month = Decimal('0')
        elif diff < 0:
            # JJR paid more — next month overpaid = excess
            next_settlement.pending_prev_month = Decimal('0')
            next_settlement.overpaid_prev_month = abs(diff)
        else:
            next_settlement.pending_prev_month = Decimal('0')
            next_settlement.overpaid_prev_month = Decimal('0')

        next_settlement.save(update_fields=[
            'pending_prev_month', 'overpaid_prev_month', 'updated_at'
        ])

    def _next_month(self):
        from datetime import date
        y, m = self.month_year.year, self.month_year.month
        return date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
