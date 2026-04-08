"""
Vehicles Models - Vehicle and Vendor Management
"""
import uuid
from django.db import models


class Vendor(models.Model):
    """Vendor Model for vendor-owned vehicles"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    email = models.EmailField(null=True, blank=True)
    address = models.TextField(blank=True)
    contact_person = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendors'
        ordering = ['name']
        verbose_name = 'Vendor'
        verbose_name_plural = 'Vendors'
    
    def __str__(self):
        return self.name
    
    def get_total_km_this_month(self):
        """Get total KM for all vendor vehicles this month"""
        from django.utils import timezone
        from apps.trips.models import Trip
        
        current_month = timezone.now().replace(day=1)
        return Trip.objects.filter(
            vehicle__vendor=self,
            trip_date__month=current_month.month,
            trip_date__year=current_month.year,
            status='approved'
        ).aggregate(
            total_km=models.Sum('total_km')
        )['total_km'] or 0


class Vehicle(models.Model):
    """Vehicle Model - Supports both Owner and Vendor vehicles"""
    
    OWNER_TYPE_CHOICES = [
        ('owner', 'Owner'),
        ('vendor', 'Vendor'),
    ]
    
    VEHICLE_TYPE_CHOICES = [
        ('pickup', 'Pickup'),
        ('truck', 'Truck'),
        ('van', 'Van'),
        ('bike', 'Bike'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=50, choices=VEHICLE_TYPE_CHOICES, default='pickup')
    owner_type = models.CharField(max_length=20, choices=OWNER_TYPE_CHOICES)
    
    # For vendor vehicles
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehicles'
    )
    km_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0, 
                                   help_text='Rate per KM for vendor vehicles')
    
    # For owner vehicles
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                       help_text='Base salary for owner vehicle drivers')
    
    fuel_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                        help_text='KM per liter')
    insurance_expiry = models.DateField(null=True, blank=True)
    fc_expiry = models.DateField(null=True, blank=True, help_text='Fitness Certificate Expiry')
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vehicles'
        ordering = ['vehicle_number']
        verbose_name = 'Vehicle'
        verbose_name_plural = 'Vehicles'
    
    def __str__(self):
        return f"{self.vehicle_number} ({self.get_owner_type_display()})"
    
    def is_owner_vehicle(self):
        return self.owner_type == 'owner'
    
    def is_vendor_vehicle(self):
        return self.owner_type == 'vendor'
    
    def get_primary_driver(self):
        """Get the primary driver assigned to this vehicle"""
        mapping = self.driver_mappings.filter(
            is_primary=True,
            unassigned_at__isnull=True
        ).select_related('driver__user').first()
        return mapping.driver if mapping else None
    
    def get_all_active_drivers(self):
        """Get all active drivers assigned to this vehicle"""
        from apps.drivers.models import Driver
        return Driver.objects.filter(
            vehicle_mappings__vehicle=self,
            vehicle_mappings__unassigned_at__isnull=True,
            is_active=True
        )
    
    def get_total_trips_this_month(self):
        """Get total approved trips this month"""
        from django.utils import timezone
        from apps.trips.models import Trip
        
        current_month = timezone.now().replace(day=1)
        return Trip.objects.filter(
            vehicle=self,
            trip_date__month=current_month.month,
            trip_date__year=current_month.year,
            status='approved'
        ).count()
    
    def get_total_km_this_month(self):
        """Get total KM for approved trips this month"""
        from django.utils import timezone
        from apps.trips.models import Trip
        
        current_month = timezone.now().replace(day=1)
        return Trip.objects.filter(
            vehicle=self,
            trip_date__month=current_month.month,
            trip_date__year=current_month.year,
            status='approved'
        ).aggregate(
            total_km=models.Sum('total_km')
        )['total_km'] or 0
    
    def get_total_expenses_this_month(self):
        """Get total expenses this month"""
        from django.utils import timezone
        from apps.expenses.models import Expense
        
        current_month = timezone.now().replace(day=1)
        return Expense.objects.filter(
            vehicle=self,
            expense_date__month=current_month.month,
            expense_date__year=current_month.year
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
