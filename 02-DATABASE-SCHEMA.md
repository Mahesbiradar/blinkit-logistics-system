# Blinkit Logistics System - Database Schema

## Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│     users       │       │     drivers      │       │    vehicles     │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────┤ id (PK)          │       │ id (PK)         │
│ email           │       │ user_id (FK)     │       │ vehicle_number  │
│ phone           │       │ license_number   │       │ vehicle_type    │
│ password        │       │ base_salary      │       │ owner_type      │
│ role            │       │ joining_date     │       │ vendor_id (FK)  │
│ is_active       │       │ is_active        │       │ km_rate         │
│ created_at      │       │ created_at       │       │ is_active       │
└─────────────────┘       └──────────────────┘       └─────────────────┘
         │                         │                          │
         │                         │                          │
         │              ┌──────────┴──────────┐               │
         │              │                     │               │
         │              ▼                     ▼               │
         │       ┌─────────────┐      ┌─────────────┐        │
         │       │driver_vehicle│      │   vendors   │◄───────┘
         │       │   mapping   │      ├─────────────┤
         │       ├─────────────┤      │ id (PK)     │
         │       │ id (PK)     │      │ name        │
         │       │ driver_id   │      │ phone       │
         │       │ vehicle_id  │      │ email       │
         │       │ is_primary  │      │ address     │
         │       │ assigned_at │      │ created_at  │
         │       └─────────────┘      └─────────────┘
         │
         │
         └─────────────────────────────────────────────────────────────┐
                                                                       │
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┤
│     trips       │       │    expenses      │       │   payments      │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)          │       │ id (PK)         │
│ driver_id (FK)  │◄──────┤ driver_id (FK)   │       │ driver_id (FK)  │
│ vehicle_id (FK) │◄──────┤ vehicle_id (FK)  │       │ vehicle_id (FK) │
│ trip_date       │       │ trip_id (FK)     │◄──────┤ month_year      │
│ store_name      │       │ expense_type     │       │ base_salary     │
│ one_way_km      │       │ amount           │       │ total_advance   │
│ total_km        │       │ expense_date     │       │ total_expenses  │
│ gate_pass_image │       │ description      │       │ final_amount    │
│ map_image       │       │ receipt_image    │       │ payment_status  │
│ status          │       │ payment_mode     │       │ paid_at         │
│ approved_by(FK) │       │ created_at       │       │ created_at      │
│ approved_at     │       └──────────────────┘       └─────────────────┘
│ remarks         │
│ created_at      │
└─────────────────┘
```

---

## PostgreSQL Schema

```sql
-- ============================================
-- BLINKIT LOGISTICS SYSTEM - DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'coordinator', 'driver')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================
-- 2. VENDORS TABLE
-- ============================================
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    contact_person VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_phone ON vendors(phone);
CREATE INDEX idx_vendors_active ON vendors(is_active);

-- ============================================
-- 3. VEHICLES TABLE
-- ============================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'pickup',
    owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('owner', 'vendor')),
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    km_rate DECIMAL(10, 2) DEFAULT 0.00,  -- Rate per KM for vendor vehicles
    base_salary DECIMAL(10, 2) DEFAULT 0.00,  -- For owner vehicle drivers
    fuel_average DECIMAL(5, 2),  -- KM per liter
    insurance_expiry DATE,
    fc_expiry DATE,  -- Fitness Certificate
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);
CREATE INDEX idx_vehicles_owner_type ON vehicles(owner_type);
CREATE INDEX idx_vehicles_vendor ON vehicles(vendor_id);
CREATE INDEX idx_vehicles_active ON vehicles(is_active);

-- ============================================
-- 4. DRIVERS TABLE
-- ============================================
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE,
    license_expiry DATE,
    aadhar_number VARCHAR(12),
    emergency_contact VARCHAR(15),
    address TEXT,
    base_salary DECIMAL(10, 2) DEFAULT 0.00,
    joining_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drivers_user ON drivers(user_id);
CREATE INDEX idx_drivers_license ON drivers(license_number);
CREATE INDEX idx_drivers_active ON drivers(is_active);

-- ============================================
-- 5. DRIVER VEHICLE MAPPING TABLE
-- ============================================
CREATE TABLE driver_vehicle_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(driver_id, vehicle_id)
);

CREATE INDEX idx_dvm_driver ON driver_vehicle_mappings(driver_id);
CREATE INDEX idx_dvm_vehicle ON driver_vehicle_mappings(vehicle_id);
CREATE INDEX idx_dvm_primary ON driver_vehicle_mappings(is_primary);

-- ============================================
-- 6. TRIPS TABLE
-- ============================================
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL,
    warehouse VARCHAR(50) DEFAULT 'B3 WH',
    
    -- Trip 1 Details
    dispatch_time_1 TIME,
    store_name_1 VARCHAR(200),
    one_way_km_1 DECIMAL(8, 2),
    
    -- Trip 2 Details
    dispatch_time_2 TIME,
    store_name_2 VARCHAR(200),
    one_way_km_2 DECIMAL(8, 2),
    
    -- Calculated Fields
    total_km DECIMAL(8, 2) GENERATED ALWAYS AS (
        COALESCE(one_way_km_1 * 2, 0) + COALESCE(one_way_km_2 * 2, 0)
    ) STORED,
    
    -- Images
    gate_pass_image_url VARCHAR(500),
    map_screenshot_url VARCHAR(500),
    
    -- Status Workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Approval Details
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Metadata
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_date ON trips(trip_date);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_driver_date ON trips(driver_id, trip_date);
CREATE INDEX idx_trips_vehicle_date ON trips(vehicle_id, trip_date);

-- Partition trips table by month for performance
-- CREATE TABLE trips_y2024m01 PARTITION OF trips
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ============================================
-- 7. EXPENSES TABLE
-- ============================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    
    expense_type VARCHAR(20) NOT NULL CHECK (expense_type IN ('fuel', 'toll', 'advance', 'allowance', 'maintenance', 'other')),
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    
    description TEXT,
    receipt_image_url VARCHAR(500),
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('cash', 'phonepay', 'gpay', 'paytm', 'upi', 'card', 'other')),
    
    -- For advance tracking
    is_deducted BOOLEAN DEFAULT FALSE,
    deducted_at TIMESTAMP,
    deducted_from_payment_id UUID,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_driver ON expenses(driver_id);
CREATE INDEX idx_expenses_vehicle ON expenses(vehicle_id);
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_expenses_type ON expenses(expense_type);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_driver_date ON expenses(driver_id, expense_date);

-- ============================================
-- 8. PAYMENTS TABLE (Monthly Salary/Vendor Payments)
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('salary', 'vendor_payment', 'advance', 'reimbursement')),
    
    -- Period
    month_year DATE NOT NULL,  -- First day of the month
    
    -- Calculation Fields
    total_trips INTEGER DEFAULT 0,
    total_km DECIMAL(10, 2) DEFAULT 0.00,
    km_rate DECIMAL(10, 2) DEFAULT 0.00,
    km_amount DECIMAL(10, 2) DEFAULT 0.00,  -- total_km * km_rate
    
    base_salary DECIMAL(10, 2) DEFAULT 0.00,
    total_fuel_expenses DECIMAL(10, 2) DEFAULT 0.00,
    total_advance DECIMAL(10, 2) DEFAULT 0.00,
    total_toll_expenses DECIMAL(10, 2) DEFAULT 0.00,
    total_allowance DECIMAL(10, 2) DEFAULT 0.00,
    other_deductions DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Final Calculation
    gross_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_deductions DECIMAL(10, 2) DEFAULT 0.00,
    final_amount DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Payment Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
    paid_at TIMESTAMP,
    paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
    payment_mode VARCHAR(20),
    transaction_reference VARCHAR(100),
    
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure either driver or vendor is set
    CONSTRAINT chk_payment_recipient CHECK (
        (driver_id IS NOT NULL AND vendor_id IS NULL) OR
        (driver_id IS NULL AND vendor_id IS NOT NULL) OR
        (driver_id IS NOT NULL AND vendor_id IS NOT NULL)
    )
);

CREATE INDEX idx_payments_driver ON payments(driver_id);
CREATE INDEX idx_payments_vehicle ON payments(vehicle_id);
CREATE INDEX idx_payments_vendor ON payments(vendor_id);
CREATE INDEX idx_payments_month ON payments(month_year);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(payment_type);

-- ============================================
-- 9. OTP TABLE (For authentication)
-- ============================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL DEFAULT 'login', -- login, password_reset
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_phone ON otp_codes(phone);
CREATE INDEX idx_otp_code ON otp_codes(otp_code);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- ============================================
-- 10. ACTIVITY LOG TABLE (Audit Trail)
-- ============================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- trip, expense, payment, etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_user ON activity_logs(user_id);
CREATE INDEX idx_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_logs_created ON activity_logs(created_at);

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- Daily Trip Summary View
CREATE VIEW v_daily_trip_summary AS
SELECT 
    trip_date,
    COUNT(*) as total_trips,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_trips,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_trips,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_trips,
    SUM(total_km) as total_km,
    COUNT(DISTINCT driver_id) as active_drivers
FROM trips
GROUP BY trip_date;

-- Driver Performance View
CREATE VIEW v_driver_performance AS
SELECT 
    d.id as driver_id,
    u.first_name || ' ' || COALESCE(u.last_name, '') as driver_name,
    u.phone as driver_phone,
    COUNT(t.id) as total_trips,
    SUM(t.total_km) as total_km,
    AVG(t.total_km) as avg_km_per_trip,
    COUNT(CASE WHEN t.status = 'approved' THEN 1 END) as approved_trips
FROM drivers d
JOIN users u ON d.user_id = u.id
LEFT JOIN trips t ON d.id = t.driver_id
WHERE t.trip_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY d.id, u.first_name, u.last_name, u.phone;

-- Vehicle Utilization View
CREATE VIEW v_vehicle_utilization AS
SELECT 
    v.id as vehicle_id,
    v.vehicle_number,
    v.owner_type,
    ve.name as vendor_name,
    COUNT(t.id) as total_trips,
    SUM(t.total_km) as total_km,
    SUM(e.amount) as total_expenses
FROM vehicles v
LEFT JOIN vendors ve ON v.vendor_id = ve.id
LEFT JOIN trips t ON v.id = t.vehicle_id AND t.trip_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN expenses e ON v.id = e.vehicle_id AND e.expense_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY v.id, v.vehicle_number, v.owner_type, ve.name;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate trip total_km (backup for generated column)
CREATE OR REPLACE FUNCTION calculate_trip_km()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_km := COALESCE(NEW.one_way_km_1 * 2, 0) + COALESCE(NEW.one_way_km_2 * 2, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default owner user (password: admin123 - change in production!)
-- Password hash is 'pbkdf2_sha256$...' placeholder - use Django createsuperuser
INSERT INTO users (email, phone, role, first_name, is_active) VALUES
('admin@jjrlogistics.com', '9999999999', 'owner', 'Admin', TRUE);

-- Insert sample vendors
INSERT INTO vendors (name, phone, contact_person) VALUES
('Vendor A Transport', '9876543210', 'Mr. Sharma'),
('Vendor B Logistics', '9876543211', 'Mr. Kumar');

-- Insert sample vehicles
INSERT INTO vehicles (vehicle_number, vehicle_type, owner_type, km_rate, base_salary) VALUES
('KA63A5950', 'pickup', 'owner', 0, 18000),
('KA63A5947', 'pickup', 'owner', 0, 18000),
('KA63A5948', 'pickup', 'owner', 0, 18000),
('KA33B6511', 'pickup', 'vendor', 25.50, 0),
('KA598636', 'pickup', 'vendor', 26.00, 0),
('KA15A6749', 'pickup', 'owner', 0, 16000),
('KA15A5404', 'pickup', 'owner', 0, 17000),
('KA06AA7645', 'pickup', 'vendor', 24.50, 0),
('KA598849', 'pickup', 'vendor', 25.00, 0),
('KA54A0090', 'pickup', 'owner', 0, 16500);

-- Insert sample drivers (users must be created first via Django)
-- Drivers will be linked after user creation

```

---

## Django Models

```python
# backend/apps/accounts/models.py
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User Model"""
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('coordinator', 'Coordinator'),
        ('driver', 'Driver'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=15, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['first_name', 'role']
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.first_name} ({self.phone})"
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name or ''}".strip()
    
    def is_owner(self):
        return self.role == 'owner'
    
    def is_coordinator(self):
        return self.role == 'coordinator'
    
    def is_driver_role(self):
        return self.role == 'driver'


# backend/apps/vehicles/models.py
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
    
    def __str__(self):
        return self.name


class Vehicle(models.Model):
    """Vehicle Model"""
    OWNER_TYPE_CHOICES = [
        ('owner', 'Owner'),
        ('vendor', 'Vendor'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=50, default='pickup')
    owner_type = models.CharField(max_length=20, choices=OWNER_TYPE_CHOICES)
    
    # For vendor vehicles
    vendor = models.ForeignKey(
        Vendor, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='vehicles'
    )
    km_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # For owner vehicles
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    fuel_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    fc_expiry = models.DateField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vehicles'
        ordering = ['vehicle_number']
    
    def __str__(self):
        return f"{self.vehicle_number} ({self.get_owner_type_display()})"
    
    def is_owner_vehicle(self):
        return self.owner_type == 'owner'
    
    def is_vendor_vehicle(self):
        return self.owner_type == 'vendor'


# backend/apps/drivers/models.py
class Driver(models.Model):
    """Driver Profile Model"""
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
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    joining_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'drivers'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.user.get_full_name()
    
    def get_primary_vehicle(self):
        mapping = self.vehicle_mappings.filter(is_primary=True, unassigned_at__isnull=True).first()
        return mapping.vehicle if mapping else None
    
    def get_total_advance(self, month_year=None):
        """Get total unpaid advance for a specific month"""
        from apps.expenses.models import Expense
        queryset = Expense.objects.filter(
            driver=self,
            expense_type='advance',
            is_deducted=False
        )
        if month_year:
            queryset = queryset.filter(expense_date__month=month_year.month)
        return queryset.aggregate(total=models.Sum('amount'))['total'] or 0


class DriverVehicleMapping(models.Model):
    """Many-to-Many mapping between drivers and vehicles"""
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
    is_primary = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'driver_vehicle_mappings'
        unique_together = ['driver', 'vehicle']
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.driver} - {self.vehicle}"


# backend/apps/trips/models.py
class Trip(models.Model):
    """Trip Model"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    driver = models.ForeignKey(
        'drivers.Driver',
        on_delete=models.CASCADE,
        related_name='trips'
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='trips'
    )
    trip_date = models.DateField()
    warehouse = models.CharField(max_length=50, default='B3 WH')
    
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
    
    # Images
    gate_pass_image = models.ImageField(upload_to='trips/gate_pass/%Y/%m/', null=True, blank=True)
    map_screenshot = models.ImageField(upload_to='trips/maps/%Y/%m/', null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Approval
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
        indexes = [
            models.Index(fields=['driver', 'trip_date']),
            models.Index(fields=['vehicle', 'trip_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Trip {self.id} - {self.driver} - {self.trip_date}"
    
    def save(self, *args, **kwargs):
        # Calculate total KM
        km1 = (self.one_way_km_1 or 0) * 2 if self.one_way_km_1 else 0
        km2 = (self.one_way_km_2 or 0) * 2 if self.one_way_km_2 else 0
        self.total_km = km1 + km2
        super().save(*args, **kwargs)
    
    def approve(self, user):
        self.status = 'approved'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()
    
    def reject(self, user, reason=''):
        self.status = 'rejected'
        self.approved_by = user
        self.approved_at = timezone.now()
        self.rejection_reason = reason
        self.save()
    
    def has_trip1(self):
        return bool(self.store_name_1 and self.one_way_km_1)
    
    def has_trip2(self):
        return bool(self.store_name_2 and self.one_way_km_2)


# backend/apps/expenses/models.py
class Expense(models.Model):
    """Expense Model"""
    EXPENSE_TYPE_CHOICES = [
        ('fuel', 'Fuel'),
        ('toll', 'Toll'),
        ('advance', 'Advance'),
        ('allowance', 'Allowance'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
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
        related_name='expenses'
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
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
    receipt_image = models.ImageField(upload_to='expenses/receipts/%Y/%m/', null=True, blank=True)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, blank=True)
    
    # Advance tracking
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
        indexes = [
            models.Index(fields=['driver', 'expense_date']),
            models.Index(fields=['vehicle', 'expense_date']),
            models.Index(fields=['expense_type']),
        ]
    
    def __str__(self):
        return f"{self.get_expense_type_display()} - ₹{self.amount}"
    
    def mark_deducted(self):
        self.is_deducted = True
        self.deducted_at = timezone.now()
        self.save()


# backend/apps/payments/models.py
class Payment(models.Model):
    """Payment/Salary Model"""
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
    month_year = models.DateField()  # First day of the month
    
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
        indexes = [
            models.Index(fields=['driver', 'month_year']),
            models.Index(fields=['vehicle', 'month_year']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        recipient = self.driver or self.vendor
        return f"{self.get_payment_type_display()} - {recipient} - {self.month_year.strftime('%B %Y')}"
    
    def calculate_totals(self):
        """Calculate gross, deductions, and final amount"""
        if self.payment_type == 'salary':
            # Owner vehicle driver
            self.gross_amount = self.base_salary
            self.total_deductions = self.total_advance + self.other_deductions
        elif self.payment_type == 'vendor_payment':
            # Vendor payment
            self.km_amount = self.total_km * self.km_rate
            self.gross_amount = self.km_amount
            self.total_deductions = self.total_fuel_expenses + self.total_advance + self.other_deductions
        
        self.final_amount = self.gross_amount - self.total_deductions
        self.save()
    
    def mark_paid(self, user, payment_mode='', reference=''):
        self.status = 'paid'
        self.paid_at = timezone.now()
        self.paid_by = user
        self.payment_mode = payment_mode
        self.transaction_reference = reference
        self.save()


# backend/apps/accounts/otp_model.py
class OTPCode(models.Model):
    """OTP Codes for authentication"""
    PURPOSE_CHOICES = [
        ('login', 'Login'),
        ('password_reset', 'Password Reset'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=15)
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='login')
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempt_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'otp_codes'
        ordering = ['-created_at']
    
    def is_valid(self):
        return not self.is_used and self.expires_at > timezone.now()
    
    def mark_used(self):
        self.is_used = True
        self.save()
    
    def increment_attempt(self):
        self.attempt_count += 1
        self.save()


# backend/apps/common/activity_log.py
class ActivityLog(models.Model):
    """Audit trail for all important actions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    action = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField(null=True, blank=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action} on {self.entity_type} by {self.user}"
```

---

## Indexes Summary

| Table | Index Name | Fields | Purpose |
|-------|------------|--------|---------|
| users | idx_users_phone | phone | Fast login lookup |
| users | idx_users_role | role | Role-based filtering |
| vehicles | idx_vehicles_number | vehicle_number | Quick vehicle search |
| vehicles | idx_vehicles_owner_type | owner_type | Owner/vendor filtering |
| drivers | idx_drivers_user | user_id | Profile lookup |
| trips | idx_trips_driver_date | driver_id, trip_date | Driver trip history |
| trips | idx_trips_vehicle_date | vehicle_id, trip_date | Vehicle trip history |
| trips | idx_trips_status | status | Status filtering |
| expenses | idx_expenses_driver_date | driver_id, expense_date | Driver expense report |
| expenses | idx_expenses_type | expense_type | Expense type filtering |
| payments | idx_payments_month | month_year | Monthly payment queries |

---

## Data Retention Policy

| Data Type | Retention Period | Action |
|-----------|-----------------|--------|
| Trips | 2 years | Archive to cold storage |
| Expenses | 2 years | Archive to cold storage |
| OTP Codes | 7 days | Auto-delete |
| Activity Logs | 1 year | Archive to cold storage |
| Images | 2 years | Move to Glacier |

---

*Document Version: 1.0*
*Last Updated: April 2026*
