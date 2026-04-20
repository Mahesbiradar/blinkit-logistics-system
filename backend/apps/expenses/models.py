"""
Expenses Models - Expense Management
"""
import uuid
from django.db import models
from django.utils import timezone


class Expense(models.Model):
    """
    Expense Model
    Tracks all expenses: Fuel, Toll, Advance, Allowance, Maintenance
    """
    
    EXPENSE_TYPE_CHOICES = [
        ('fuel', 'Fuel'),
        ('toll', 'Toll'),
        ('advance', 'Advance'),
        ('allowance', 'Allowance'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
        ('company_management', 'Company / Management'),
    ]
    
    PAYMENT_MODE_CHOICES = [
        ('cash', 'Cash'),
        ('phonepay', 'PhonePe'),
        ('gpay', 'Google Pay'),
        ('paytm', 'Paytm'),
        ('upi', 'UPI'),
        ('card', 'Card'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    driver = models.ForeignKey(
        'drivers.Driver',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='expenses'
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='expenses'
    )
    trip = models.ForeignKey(
        'trips.Trip',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses'
    )
    
    expense_type = models.CharField(max_length=20, choices=EXPENSE_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense_date = models.DateField()
    
    description = models.TextField(blank=True)
    receipt_image = models.ImageField(
        upload_to='expenses/receipts/%Y/%m/',
        null=True,
        blank=True
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        blank=True
    )
    
    # Toll is always paid by owner (Blinkit reimburses) — never deducted from driver/vendor
    is_blinkit_reimbursable = models.BooleanField(default=False)

    # Advance tracking - marks if this advance has been deducted from payment
    is_deducted = models.BooleanField(default=False)
    deducted_at = models.DateTimeField(null=True, blank=True)
    
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'expenses'
        ordering = ['-expense_date', '-created_at']
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        indexes = [
            models.Index(fields=['driver', 'expense_date']),
            models.Index(fields=['vehicle', 'expense_date']),
            models.Index(fields=['expense_type']),
            models.Index(fields=['expense_date']),
            models.Index(fields=['is_deducted']),
        ]
    
    def __str__(self):
        return f"{self.get_expense_type_display()} - ₹{self.amount}"
    
    def mark_deducted(self):
        """Mark this expense as deducted from payment"""
        self.is_deducted = True
        self.deducted_at = timezone.now()
        self.save(update_fields=['is_deducted', 'deducted_at'])
    
    def is_advance(self):
        """Check if this is an advance expense"""
        return self.expense_type == 'advance'
    
    def is_fuel(self):
        """Check if this is a fuel expense"""
        return self.expense_type == 'fuel'
    
    @classmethod
    def get_driver_expenses_for_month(cls, driver, year, month):
        """Get all expenses for a driver in a specific month"""
        return cls.objects.filter(
            driver=driver,
            expense_date__year=year,
            expense_date__month=month
        )
    
    @classmethod
    def get_driver_advance_total(cls, driver, year, month):
        """Get total advance for a driver in a specific month"""
        return cls.objects.filter(
            driver=driver,
            expense_type='advance',
            expense_date__year=year,
            expense_date__month=month,
            is_deducted=False
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
    
    @classmethod
    def get_vehicle_fuel_total(cls, vehicle, year, month):
        """Get total fuel expenses for a vehicle in a specific month"""
        return cls.objects.filter(
            vehicle=vehicle,
            expense_type='fuel',
            expense_date__year=year,
            expense_date__month=month
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
    
    @classmethod
    def get_expense_summary_by_type(cls, driver, year, month):
        """Get expense summary grouped by type"""
        from django.db.models import Sum
        
        expenses = cls.objects.filter(
            driver=driver,
            expense_date__year=year,
            expense_date__month=month
        ).values('expense_type').annotate(
            total=Sum('amount')
        )
        
        return {e['expense_type']: e['total'] for e in expenses}
