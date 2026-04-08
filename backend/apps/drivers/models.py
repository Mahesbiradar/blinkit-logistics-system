"""
Drivers Models - Driver Profile and Vehicle Assignment
"""
import uuid
from django.db import models
from django.utils import timezone


class Driver(models.Model):
    """Driver Profile Model - Extends User model"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='driver_profile'
    )
    
    license_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    aadhar_number = models.CharField(max_length=12, blank=True)
    emergency_contact = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    
    # Override vehicle base salary if needed
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    joining_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'drivers'
        ordering = ['-created_at']
        verbose_name = 'Driver'
        verbose_name_plural = 'Drivers'
    
    def __str__(self):
        return self.user.get_full_name()
    
    def get_primary_vehicle(self):
        """Get the primary vehicle assigned to this driver"""
        mapping = self.vehicle_mappings.filter(
            is_primary=True,
            unassigned_at__isnull=True
        ).select_related('vehicle').first()
        return mapping.vehicle if mapping else None
    
    def get_all_active_vehicles(self):
        """Get all active vehicles assigned to this driver"""
        from apps.vehicles.models import Vehicle
        return Vehicle.objects.filter(
            driver_mappings__driver=self,
            driver_mappings__unassigned_at__isnull=True,
            is_active=True
        )
    
    def get_total_trips_this_month(self):
        """Get total trips this month"""
        current_month = timezone.now().replace(day=1)
        return self.trips.filter(
            trip_date__month=current_month.month,
            trip_date__year=current_month.year
        ).count()
    
    def get_approved_trips_this_month(self):
        """Get approved trips this month"""
        current_month = timezone.now().replace(day=1)
        return self.trips.filter(
            trip_date__month=current_month.month,
            trip_date__year=current_month.year,
            status='approved'
        ).count()
    
    def get_total_km_this_month(self):
        """Get total KM for approved trips this month"""
        current_month = timezone.now().replace(day=1)
        from apps.trips.models import Trip
        return Trip.objects.filter(
            driver=self,
            trip_date__month=current_month.month,
            trip_date__year=current_month.year,
            status='approved'
        ).aggregate(
            total_km=models.Sum('total_km')
        )['total_km'] or 0
    
    def get_total_advance_this_month(self):
        """Get total advance taken this month"""
        current_month = timezone.now().replace(day=1)
        return self.expenses.filter(
            expense_type='advance',
            expense_date__month=current_month.month,
            expense_date__year=current_month.year,
            is_deducted=False
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
    
    def get_total_unpaid_advance(self):
        """Get total unpaid advance"""
        return self.expenses.filter(
            expense_type='advance',
            is_deducted=False
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0
    
    def get_effective_base_salary(self):
        """Get effective base salary (from driver or vehicle)"""
        if self.base_salary > 0:
            return self.base_salary
        
        primary_vehicle = self.get_primary_vehicle()
        if primary_vehicle and primary_vehicle.is_owner_vehicle():
            return primary_vehicle.base_salary
        
        return 0


class DriverVehicleMapping(models.Model):
    """
    Many-to-Many mapping between drivers and vehicles
    Supports multiple drivers per vehicle and multiple vehicles per driver
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver = models.ForeignKey(
        Driver,
        on_delete=models.CASCADE,
        related_name='vehicle_mappings'
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='driver_mappings'
    )
    
    is_primary = models.BooleanField(default=False, 
                                      help_text='Primary vehicle for this driver')
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'driver_vehicle_mappings'
        unique_together = ['driver', 'vehicle']
        ordering = ['-assigned_at']
        verbose_name = 'Driver-Vehicle Mapping'
        verbose_name_plural = 'Driver-Vehicle Mappings'
    
    def __str__(self):
        return f"{self.driver} - {self.vehicle}"
    
    def unassign(self):
        """Mark this mapping as unassigned"""
        self.unassigned_at = timezone.now()
        self.is_primary = False
        self.save(update_fields=['unassigned_at', 'is_primary'])
