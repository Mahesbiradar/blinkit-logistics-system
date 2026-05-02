# Vehicle

## Purpose
Represents a physical delivery vehicle. Two ownership models exist: owner-owned (fixed-salary driver, owner bears all costs) and vendor-supplied (per-KM rate settlement with vendor). This distinction drives which payment formula applies each month.

## Source files
- Model: backend/apps/vehicles/models.py
- Migration/Schema: backend/apps/vehicles/migrations/0001_initial.py
- Controller/Service: backend/apps/vehicles/views.py
- Routes: backend/apps/vehicles/urls.py
- Validators: backend/apps/vehicles/serializers.py (`VehicleWriteSerializer`)
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| vehicle_number | CharField(20) | No | — | unique=True | License plate; validated case-insensitive in serializer |
| vehicle_type | CharField(50) | No | `'pickup'` | choices: pickup/truck/van/bike/other | |
| owner_type | CharField(20) | No | — | choices: owner/vendor | Drives payment formula selection |
| vendor | ForeignKey → vehicles.Vendor | Yes | — | SET_NULL on delete | Required when owner_type='vendor'; null for owner vehicles |
| km_rate | DecimalField(10,2) | No | 0 | — | Used only for vendor vehicles; zeroed for owner type in serializer |
| base_salary | DecimalField(10,2) | No | 0 | — | Used only for owner vehicles; zeroed for vendor type in serializer |
| fuel_average | DecimalField(5,2) | Yes | — | — | KM per liter; informational only, not used in calculations |
| insurance_expiry | DateField | Yes | — | — | No automated alert |
| fc_expiry | DateField | Yes | — | — | Fitness Certificate expiry; no automated alert |
| is_active | BooleanField | No | True | — | Soft-delete flag |
| created_at | DateTimeField | No | auto_now_add | — | |
| updated_at | DateTimeField | No | auto_now | — | |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| vendor | belongs_to | vehicles.Vendor | vendor_id | SET_NULL | Null for owner vehicles |
| driver_mappings | has_many (reverse) | DriverVehicleMapping | DriverVehicleMapping.vehicle | CASCADE | Full assignment history |
| trips | has_many (reverse) | Trip | Trip.vehicle | CASCADE | All trips (including rejected) |
| expenses | has_many (reverse) | Expense | Expense.vehicle | CASCADE | All expense types |
| payments | has_many (reverse) | Payment | Payment.vehicle | CASCADE | Monthly settlements |

## Indexes
- `vehicle_number` — unique index
- `vehicle_number` — ordering field (alphabetical)

## Validations & business rules
- `vehicle_number` is validated case-insensitively unique in `VehicleWriteSerializer` (e.g. `MH12AB1234` and `mh12ab1234` are treated as duplicates)
- When `owner_type='vendor'`, serializer requires `vendor` to be provided and zeros `base_salary`
- When `owner_type='owner'`, serializer zeros `km_rate`
- `fuel_average`, `insurance_expiry`, `fc_expiry` are optional metadata fields not used in any business calculation
- Payment formula selected by owner_type at the time payment is calculated (not locked on vehicle)

## State / status (if applicable)
- `is_active`: True → False. Inactive vehicles are filtered from list views but trips/expenses referencing them remain.

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| GET | /api/v1/vehicles/ | List vehicles (filter: owner_type, is_active) | Owner/Coordinator |
| POST | /api/v1/vehicles/ | Create vehicle | Owner/Coordinator |
| GET | /api/v1/vehicles/{id}/ | Vehicle detail | Owner/Coordinator |
| PUT/PATCH | /api/v1/vehicles/{id}/ | Update vehicle | Owner/Coordinator |
| DELETE | /api/v1/vehicles/{id}/ | Delete vehicle | Owner/Coordinator |
| POST | /api/v1/vehicles/{id}/assign-driver/ | Assign existing driver to this vehicle | Owner/Coordinator |
| POST | /api/v1/vehicles/{id}/create-driver/ | Create driver account + assign | Owner/Coordinator |
| PATCH | /api/v1/vehicles/{id}/driver-login/ | Update primary driver's phone/password | Owner/Coordinator |

## Lifecycle hooks / side effects
- No model-level hooks; serializer zeros irrelevant rate field on save.

## Open questions / known limitations
- `km_rate` and `base_salary` are on both Vehicle and Driver — the effective salary lookup (`Driver.get_effective_base_salary()`) checks driver's `base_salary` first, then falls back to vehicle's. This dual-location is easy to get wrong when editing.
- No history of ownership type changes — if a vehicle switches from vendor to owner, old payments calculated at vendor rate are not retroactively marked.
- `fuel_average` is stored but never used in any calculation in the codebase.
- `insurance_expiry` and `fc_expiry` are stored but no expiry-warning logic exists.
