"""
Trips Models - Trip Management
"""
import uuid
from django.db import models
from django.utils import timezone


class Store(models.Model):
    """Master list of Blinkit stores / delivery destinations"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, blank=True)
    area = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stores'
        ordering = ['name']
        verbose_name = 'Store'
        verbose_name_plural = 'Stores'

    def __str__(self):
        return self.name


class Trip(models.Model):
    """
    Trip Model
    Supports up to 2 trips per day (Trip 1 and Trip 2)
    Total KM is auto-calculated: (one_way_km_1 * 2) + (one_way_km_2 * 2)
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    CATEGORY_CHOICES = [
        ('regular', 'Regular'),
        ('adhoc', 'Adhoc'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    driver = models.ForeignKey(
        'drivers.Driver',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='trips'
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='trips'
    )

    # Adhoc-only fields — populated when trip_category='adhoc' and no vehicle/driver FK
    adhoc_vehicle_number = models.CharField(max_length=50, blank=True)
    adhoc_driver_name = models.CharField(max_length=200, blank=True)
    adhoc_driver_phone = models.CharField(max_length=20, blank=True)

    trip_date = models.DateField()
    warehouse = models.CharField(max_length=50, default='B3 WH')
    trip_category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default='regular'
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_trips',
    )
    
    # Trip 1 Details
    dispatch_time_1 = models.TimeField(null=True, blank=True)
    store_name_1 = models.CharField(max_length=200, blank=True)
    one_way_km_1 = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    # Trip 2 Details
    dispatch_time_2 = models.TimeField(null=True, blank=True)
    store_name_2 = models.CharField(max_length=200, blank=True)
    one_way_km_2 = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    # Total KM is calculated automatically
    total_km = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    
    # Images — Store 1
    gate_pass_image = models.ImageField(upload_to='trips/gate_pass/%Y/%m/', null=True, blank=True)
    map_screenshot = models.ImageField(upload_to='trips/maps/%Y/%m/', null=True, blank=True)

    # Images — Store 2 (optional, used when a second store is added)
    gate_pass_image_2 = models.ImageField(upload_to='trips/gate_pass/%Y/%m/', null=True, blank=True)
    map_screenshot_2 = models.ImageField(upload_to='trips/maps/%Y/%m/', null=True, blank=True)
    
    # Status Workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Approval Details
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_trips'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trips'
        ordering = ['-trip_date', '-created_at']
        verbose_name = 'Trip'
        verbose_name_plural = 'Trips'
        indexes = [
            models.Index(fields=['driver', 'trip_date']),
            models.Index(fields=['vehicle', 'trip_date']),
            models.Index(fields=['status']),
            models.Index(fields=['trip_date']),
        ]
    
    def __str__(self):
        driver_str = self.adhoc_driver_name if not self.driver_id else str(self.driver)
        return f"Trip {self.id} - {driver_str} - {self.trip_date}"
    
    def save(self, *args, **kwargs):
        # Calculate total KM
        km1 = (self.one_way_km_1 or 0) * 2 if self.one_way_km_1 else 0
        km2 = (self.one_way_km_2 or 0) * 2 if self.one_way_km_2 else 0
        self.total_km = km1 + km2
        super().save(*args, **kwargs)
    
    def approve(self, user):
        """Approve this trip"""
        self.status = 'approved'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save(update_fields=['status', 'approved_by', 'approved_at'])
    
    def reject(self, user, reason=''):
        """Reject this trip"""
        self.status = 'rejected'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.rejection_reason = reason
        self.save(update_fields=['status', 'approved_by', 'approved_at', 'rejection_reason'])
    
    def has_trip1(self):
        """Check if trip 1 data exists"""
        return bool(self.store_name_1 and self.one_way_km_1)
    
    def has_trip2(self):
        """Check if trip 2 data exists"""
        return bool(self.store_name_2 and self.one_way_km_2)
    
    def get_trip1_km(self):
        """Get round-trip KM for trip 1"""
        return (self.one_way_km_1 or 0) * 2 if self.one_way_km_1 else 0
    
    def get_trip2_km(self):
        """Get round-trip KM for trip 2"""
        return (self.one_way_km_2 or 0) * 2 if self.one_way_km_2 else 0
    
    @classmethod
    def get_driver_trips_for_date(cls, driver, trip_date):
        """Get all trips for a driver on a specific date"""
        return cls.objects.filter(driver=driver, trip_date=trip_date)
    
    @classmethod
    def get_pending_trips(cls):
        """Get all pending trips"""
        return cls.objects.filter(status='pending').select_related(
            'driver__user', 'vehicle', 'approved_by'
        ).order_by('-trip_date')
    
    @classmethod
    def get_driver_monthly_stats(cls, driver, year, month):
        """Get monthly trip statistics for a driver"""
        trips = cls.objects.filter(
            driver=driver,
            trip_date__year=year,
            trip_date__month=month,
            status='approved'
        )
        
        return {
            'total_trips': trips.count(),
            'total_km': trips.aggregate(
                total=models.Sum('total_km')
            )['total'] or 0,
            'trip1_count': trips.filter(one_way_km_1__isnull=False).count(),
            'trip2_count': trips.filter(one_way_km_2__isnull=False).count(),
        }
