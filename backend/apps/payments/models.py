"""
Payments Models — VehicleSettlement
Monthly closing document per vehicle. Replaces the old Payment model.
FastagRecord (in expenses app) is completely independent — no FK between them.
"""
import uuid
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
    extra_km_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ── System-computed ────────────────────────────────────────────────────────
    total_expenses = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    carry_forward_from_previous = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_payable = models.DecimalField(max_digits=10, decimal_places=2, default=0)

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
        Aggregate total_expenses from Expense table and recompute derived fields.
        fastag_recharge rows ARE included (real money JJR paid out).
        """
        from apps.expenses.models import Expense
        from django.db.models import Sum

        self.total_expenses = (
            Expense.objects
            .filter(vehicle=self.vehicle, month_year=self.month_year)
            .aggregate(total=Sum('amount'))['total'] or 0
        )
        self.gross_amount = (
            self.base_amount
            - self.absent_penalty_amount
            + self.extra_km_amount
        )
        self.balance_payable = (
            self.gross_amount
            - self.total_expenses
            + self.carry_forward_from_previous
        )
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

    def mark_paid(self, paid_by_user, paid_amount, payment_mode='', transaction_reference=''):
        self.status = 'paid'
        self.paid_amount = paid_amount
        self.paid_at = timezone.now()
        self.paid_by = paid_by_user
        self.payment_mode = payment_mode
        self.transaction_reference = transaction_reference
        self.save()

        unpaid = self.balance_payable - paid_amount
        if unpaid != 0:
            next_month = self._next_month()
            settlement, created = VehicleSettlement.objects.get_or_create(
                vehicle=self.vehicle,
                month_year=next_month,
                defaults={'status': 'draft', 'carry_forward_from_previous': unpaid},
            )
            if not created:
                settlement.carry_forward_from_previous = unpaid
                settlement.save(update_fields=['carry_forward_from_previous', 'updated_at'])

    def _next_month(self):
        from datetime import date
        y, m = self.month_year.year, self.month_year.month
        return date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
