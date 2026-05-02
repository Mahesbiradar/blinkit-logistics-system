"""
Expenses Models — Expense, FastagRecord, CompanyExpense
"""
import uuid
from django.db import models
from django.utils import timezone


class Expense(models.Model):
    """
    Running payment ledger for every rupee JJR sends out for a vehicle per month.
    All rows for a vehicle+month are summed at settlement time — no per-row deductible flag.
    """

    EXPENSE_TYPE_CHOICES = [
        ('diesel', 'Diesel'),
        ('driver_advance', 'Driver Advance'),
        ('driver_payment', 'Driver Payment'),
        ('emi', 'EMI'),
        ('fastag_recharge', 'Fastag Recharge'),
        ('adhoc_driver', 'Adhoc Driver'),
        ('repair', 'Repair'),
        ('accident', 'Accident'),
        ('fine', 'Fine'),
        ('food', 'Food'),
        ('penalty', 'Penalty'),
        ('other', 'Other'),
    ]

    PAYMENT_MODE_CHOICES = [
        ('phonepay', 'PhonePe'),
        ('kiwi', 'Kiwi'),
        ('amazon_pay', 'Amazon Pay'),
        ('whatsapp', 'WhatsApp Pay'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='expenses',
    )
    expense_date = models.DateField()
    expense_time = models.TimeField(null=True, blank=True)
    expense_type = models.CharField(max_length=30, choices=EXPENSE_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES)
    paid_to_name = models.CharField(max_length=200, blank=True)
    paid_to_number = models.CharField(max_length=50, blank=True)
    month_year = models.DateField()
    remarks = models.TextField(blank=True)
    receipt_image = models.ImageField(
        upload_to='expenses/receipts/%Y/%m/',
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-expense_date', '-created_at']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        indexes = [
            models.Index(fields=['vehicle', 'month_year']),
            models.Index(fields=['vehicle', 'expense_date']),
            models.Index(fields=['expense_type']),
            models.Index(fields=['month_year']),
        ]

    def __str__(self):
        return f"{self.get_expense_type_display()} — ₹{self.amount} ({self.expense_date})"


class FastagRecord(models.Model):
    """
    Standalone monthly Fastag ledger per vehicle.
    Completely independent from VehicleSettlement — no FK between them.
    save() always re-aggregates recharged_amount from Expense(type=fastag_recharge) rows.
    """

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('submitted', 'Submitted'),
        ('closed', 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='fastag_records',
    )
    month_year = models.DateField()
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fastag_recharged_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fastag_debited_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    closing_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    statement_submitted_at = models.DateTimeField(null=True, blank=True)
    statement_image = models.ImageField(
        upload_to='fastag/statements/%Y/%m/',
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fastag_records_created',
    )
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fastag_records_updated',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fastag_records'
        unique_together = ['vehicle', 'month_year']
        ordering = ['-month_year']
        verbose_name = 'Fastag Record'
        verbose_name_plural = 'Fastag Records'
        indexes = [
            models.Index(fields=['month_year']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Fastag {self.vehicle} — {self.month_year.strftime('%B %Y')}"

    def save(self, *args, **kwargs):
        from django.db.models import Sum
        self.fastag_recharged_amount = (
            Expense.objects
            .filter(
                vehicle=self.vehicle,
                month_year=self.month_year,
                expense_type='fastag_recharge',
            )
            .aggregate(total=Sum('amount'))['total'] or 0
        )
        self.closing_balance = (
            self.opening_balance
            + self.fastag_recharged_amount
            - self.fastag_debited_amount
        )
        super().save(*args, **kwargs)

    def mark_closed(self, closed_by_user):
        self.status = 'closed'
        self.save()
        next_month = self._next_month()
        record, created = FastagRecord.objects.get_or_create(
            vehicle=self.vehicle,
            month_year=next_month,
            defaults={'status': 'open', 'opening_balance': self.closing_balance},
        )
        if not created:
            record.opening_balance = self.closing_balance
            record.save(update_fields=['opening_balance', 'updated_at'])

    def _next_month(self):
        from datetime import date
        y, m = self.month_year.year, self.month_year.month
        return date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)


class CompanyExpense(models.Model):
    """
    JJR company-level overhead with no vehicle attached.
    Coordinator salaries, room rent, spare drivers, Flipkart expenses, etc.
    Feeds only company P&L — no link to VehicleSettlement.
    """

    EXPENSE_TYPE_CHOICES = [
        ('coordinator_salary', 'Coordinator Salary'),
        ('room_rent', 'Room Rent'),
        ('spare_driver', 'Spare Driver'),
        ('food', 'Food'),
        ('advance', 'Advance'),
        ('flipkart', 'Flipkart'),
        ('other', 'Other'),
    ]

    PAYMENT_MODE_CHOICES = [
        ('phonepay', 'PhonePe'),
        ('kiwi', 'Kiwi'),
        ('amazon_pay', 'Amazon Pay'),
        ('whatsapp', 'WhatsApp Pay'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense_date = models.DateField()
    expense_time = models.TimeField(null=True, blank=True)
    expense_type = models.CharField(max_length=30, choices=EXPENSE_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES)
    paid_to_name = models.CharField(max_length=200, blank=True)
    paid_to_number = models.CharField(max_length=50, blank=True)
    month_year = models.DateField()
    remarks = models.TextField(blank=True)
    receipt_image = models.ImageField(
        upload_to='company_expenses/%Y/%m/',
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='company_expenses_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_expenses'
        ordering = ['-expense_date', '-created_at']
        verbose_name = 'Company Expense'
        verbose_name_plural = 'Company Expenses'
        indexes = [
            models.Index(fields=['expense_type', 'month_year']),
            models.Index(fields=['month_year']),
            models.Index(fields=['expense_date']),
        ]

    def __str__(self):
        return f"{self.get_expense_type_display()} — ₹{self.amount} ({self.expense_date})"
