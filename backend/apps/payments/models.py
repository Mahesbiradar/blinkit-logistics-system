"""
Payments Models - Payment and Salary Management
"""
import uuid
from django.db import models
from django.utils import timezone


class Payment(models.Model):
    """
    Payment Model
    Handles both Owner Vehicle Driver Salaries and Vendor Payments
    """
    
    PAYMENT_TYPE_CHOICES = [
        ('salary', 'Salary'),
        ('vendor_payment', 'Vendor Payment'),
        ('advance', 'Advance'),
        ('reimbursement', 'Reimbursement'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processed', 'Processed'),
        ('paid', 'Paid'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Payment recipient (either driver or vendor)
    driver = models.ForeignKey(
        'drivers.Driver',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments'
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments'
    )
    vendor = models.ForeignKey(
        'vehicles.Vendor',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments'
    )
    
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    
    # Payment period (first day of the month)
    month_year = models.DateField()
    
    # Trip statistics
    total_trips = models.IntegerField(default=0)
    total_km = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    km_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    km_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Financial breakdown
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_fuel_expenses = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_advance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_toll_expenses = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Totals
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Payment status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    payment_mode = models.CharField(max_length=20, blank=True)
    transaction_reference = models.CharField(max_length=100, blank=True)
    
    remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-month_year', '-created_at']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['driver', 'month_year']),
            models.Index(fields=['vehicle', 'month_year']),
            models.Index(fields=['vendor', 'month_year']),
            models.Index(fields=['status']),
            models.Index(fields=['month_year']),
        ]
    
    def __str__(self):
        recipient = self.driver or self.vendor
        return f"{self.get_payment_type_display()} - {recipient} - {self.month_year.strftime('%B %Y')}"
    
    def calculate_totals(self):
        """
        Calculate gross amount, deductions, and final amount
        Based on vehicle type (owner vs vendor)
        """
        if self.payment_type == 'salary':
            # Owner vehicle driver salary
            self.gross_amount = self.base_salary
            self.total_deductions = self.total_advance + self.other_deductions
            
        elif self.payment_type == 'vendor_payment':
            # Vendor payment: (KM × Rate) - Fuel - Advance
            self.km_amount = self.total_km * self.km_rate
            self.gross_amount = self.km_amount
            self.total_deductions = (
                self.total_fuel_expenses + 
                self.total_advance + 
                self.other_deductions
            )
        
        self.final_amount = self.gross_amount - self.total_deductions
        self.save(update_fields=[
            'km_amount', 'gross_amount', 'total_deductions', 'final_amount'
        ])
    
    def mark_paid(self, user, payment_mode='', reference=''):
        """Mark payment as paid"""
        self.status = 'paid'
        self.paid_at = timezone.now()
        self.paid_by = user
        self.payment_mode = payment_mode
        self.transaction_reference = reference
        self.save(update_fields=[
            'status', 'paid_at', 'paid_by', 'payment_mode', 'transaction_reference'
        ])
        
        # Mark advances as deducted
        if self.total_advance > 0:
            from apps.expenses.models import Expense
            advances = Expense.objects.filter(
                driver=self.driver,
                expense_type='advance',
                is_deducted=False,
                expense_date__month=self.month_year.month,
                expense_date__year=self.month_year.year
            )
            for advance in advances:
                advance.mark_deducted()
    
    def is_salary_payment(self):
        """Check if this is a salary payment"""
        return self.payment_type == 'salary'
    
    def is_vendor_payment(self):
        """Check if this is a vendor payment"""
        return self.payment_type == 'vendor_payment'
    
    @classmethod
    def calculate_driver_salary(cls, driver, year, month):
        """
        Calculate salary for an owner vehicle driver
        Formula: Base Salary - Advance
        """
        from apps.trips.models import Trip
        from apps.expenses.models import Expense
        
        # Get base salary
        base_salary = driver.get_effective_base_salary()
        
        # Get approved trips
        trips = Trip.objects.filter(
            driver=driver,
            trip_date__year=year,
            trip_date__month=month,
            status='approved'
        )
        
        total_trips = trips.count()
        total_km = trips.aggregate(
            total=models.Sum('total_km')
        )['total'] or 0
        
        # Get expenses
        expenses = Expense.objects.filter(
            driver=driver,
            expense_date__year=year,
            expense_date__month=month
        )
        
        total_advance = expenses.filter(
            expense_type='advance',
            is_deducted=False
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        total_fuel = expenses.filter(
            expense_type='fuel'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        total_toll = expenses.filter(
            expense_type='toll'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        total_allowance = expenses.filter(
            expense_type='allowance'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        # Calculate
        gross_amount = base_salary
        total_deductions = total_advance
        final_amount = gross_amount - total_deductions
        
        return {
            'driver': driver,
            'month_year': timezone.datetime(year, month, 1).date(),
            'payment_type': 'salary',
            'total_trips': total_trips,
            'total_km': total_km,
            'base_salary': base_salary,
            'total_advance': total_advance,
            'total_fuel_expenses': total_fuel,
            'total_toll_expenses': total_toll,
            'total_allowance': total_allowance,
            'gross_amount': gross_amount,
            'total_deductions': total_deductions,
            'final_amount': final_amount,
        }
    
    @classmethod
    def calculate_vendor_payment(cls, vendor, vehicle, year, month):
        """
        Calculate payment for a vendor vehicle
        Formula: (Total KM × Rate per KM) - Fuel - Advance
        """
        from apps.trips.models import Trip
        from apps.drivers.models import Driver
        from apps.expenses.models import Expense
        
        # Get approved trips for this vehicle
        trips = Trip.objects.filter(
            vehicle=vehicle,
            trip_date__year=year,
            trip_date__month=month,
            status='approved'
        )
        
        total_trips = trips.count()
        total_km = trips.aggregate(
            total=models.Sum('total_km')
        )['total'] or 0
        
        # Get expenses for this vehicle
        expenses = Expense.objects.filter(
            vehicle=vehicle,
            expense_date__year=year,
            expense_date__month=month
        )
        
        total_fuel = expenses.filter(
            expense_type='fuel'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        total_advance = expenses.filter(
            expense_type='advance',
            is_deducted=False
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        total_toll = expenses.filter(
            expense_type='toll'
        ).aggregate(total=models.Sum('amount'))['total'] or 0
        
        # Calculate
        km_rate = vehicle.km_rate
        km_amount = total_km * km_rate
        gross_amount = km_amount
        total_deductions = total_fuel + total_advance
        final_amount = gross_amount - total_deductions
        
        return {
            'vendor': vendor,
            'vehicle': vehicle,
            'month_year': timezone.datetime(year, month, 1).date(),
            'payment_type': 'vendor_payment',
            'total_trips': total_trips,
            'total_km': total_km,
            'km_rate': km_rate,
            'km_amount': km_amount,
            'total_fuel_expenses': total_fuel,
            'total_advance': total_advance,
            'total_toll_expenses': total_toll,
            'gross_amount': gross_amount,
            'total_deductions': total_deductions,
            'final_amount': final_amount,
        }
