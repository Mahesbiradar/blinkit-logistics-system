# Driver

## Purpose
Driver profile that extends the User model with logistics-specific fields: license, salary, emergency contact. Exists only for users with role='driver'. Acts as the hub linking a driver's identity to their vehicles, trips, and expenses.

## Source files
- Model: backend/apps/drivers/models.py
- Migration/Schema: backend/apps/drivers/migrations/0001_initial.py
- Controller/Service: backend/apps/drivers/views.py
- Routes: backend/apps/drivers/urls.py
- Validators: backend/apps/drivers/serializers.py
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| user | OneToOneField → accounts.User | No | — | CASCADE on delete | related_name='driver_profile' |
| license_number | CharField(50) | Yes | — | unique=True, null=True | Nullable unique (multiple NULLs allowed in PostgreSQL) |
| license_expiry | DateField | Yes | — | — | No automated expiry warning |
| aadhar_number | CharField(12) | No | `''` | blank=True | Not validated for 12-digit format in model |
| emergency_contact | CharField(15) | No | `''` | blank=True | Phone number; not validated |
| address | TextField | No | `''` | blank=True | |
| base_salary | DecimalField(10,2) | No | 0 | — | Override; if 0, falls back to primary vehicle's base_salary |
| joining_date | DateField | Yes | — | — | |
| is_active | BooleanField | No | True | — | Soft-delete flag |
| created_at | DateTimeField | No | auto_now_add | — | |
| updated_at | DateTimeField | No | auto_now | — | |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| user | belongs_to | accounts.User | user_id | CASCADE | One-to-one; deleting user deletes driver |
| vehicle_mappings | has_many | DriverVehicleMapping | DriverVehicleMapping.driver | CASCADE | Full assignment history |
| trips | has_many (reverse) | Trip | Trip.driver | CASCADE | All trips including rejected |
| expenses | has_many (reverse) | Expense | Expense.driver | CASCADE | All expense types |
| payments | has_many (reverse) | Payment | Payment.driver | CASCADE | Salary payments |

## Indexes
- `user_id` — unique index (from OneToOneField)
- `license_number` — unique index (sparse, allows multiple NULL)
- `created_at` — ordering field; no explicit index

## Validations & business rules
- `DriverCreateSerializer` wraps User creation + Driver creation in `transaction.atomic()` to prevent partial records
- Phone and license_number uniqueness checked in serializer `validate()` before save
- `get_effective_base_salary()`: returns `driver.base_salary` if > 0; otherwise returns primary vehicle's `base_salary`; returns 0 if no owner vehicle assigned — this is the value used by salary calculation
- Drivers can only create/edit their own trips and expenses (enforced in trip/expense serializers via `request.user`)
- `is_active=False` does not automatically revoke JWT tokens

## State / status (if applicable)
- `is_active`: True → False (deactivated). No formal transition; set directly by admin. Active drivers appear in dropdowns; inactive are filtered out by default in list views.

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| GET | /api/v1/drivers/ | List drivers (filter: is_active, vehicle_id) | Owner/Coordinator |
| POST | /api/v1/drivers/ | Create driver + user account | Owner/Coordinator |
| GET | /api/v1/drivers/{id}/ | Driver detail | Owner/Coordinator |
| PUT/PATCH | /api/v1/drivers/{id}/ | Update driver | Owner/Coordinator |
| DELETE | /api/v1/drivers/{id}/ | Delete driver | Owner/Coordinator |
| GET | /api/v1/drivers/{id}/stats/ | Monthly trip/KM/expense stats | Owner/Coordinator |
| PATCH | /api/v1/auth/profile/driver/ | Driver updates own profile fields | Driver |

## Lifecycle hooks / side effects
- Creating a driver also assigns them to a vehicle if `vehicle_id` is passed in `DriverCreateSerializer` (creates a `DriverVehicleMapping`)
- No signals or background jobs triggered on Driver save

## Open questions / known limitations
- `base_salary` exists on both Driver and Vehicle (owner vehicles have `Vehicle.base_salary`). The override logic in `get_effective_base_salary()` is implicit and not documented in the UI — a coordinator editing a driver might not know the vehicle salary is being used
- `aadhar_number` is CharField(12) but not validated for exactly 12 numeric characters at model or serializer level
- `license_number` is `unique=True, null=True` — PostgreSQL correctly allows multiple NULL values, but this could be confusing
- No expiry alerts for `license_expiry` or vehicle `fc_expiry` / `insurance_expiry`
