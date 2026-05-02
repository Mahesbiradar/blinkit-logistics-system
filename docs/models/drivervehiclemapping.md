# DriverVehicleMapping

## Purpose
Join table implementing the many-to-many relationship between Driver and Vehicle with full assignment history. A driver can be assigned to multiple vehicles over time; a vehicle can have multiple drivers. The `unassigned_at` timestamp replaces hard-deletes so history is preserved.

## Source files
- Model: backend/apps/drivers/models.py
- Migration/Schema: backend/apps/drivers/migrations/0001_initial.py
- Controller/Service: backend/apps/vehicles/views.py (assignment managed from vehicle endpoints)
- Routes: backend/apps/vehicles/urls.py
- Validators: backend/apps/vehicles/serializers.py (`VehicleAssignDriverSerializer`)
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| driver | ForeignKey → drivers.Driver | No | — | CASCADE on delete | related_name='vehicle_mappings' |
| vehicle | ForeignKey → vehicles.Vehicle | No | — | CASCADE on delete | related_name='driver_mappings' |
| is_primary | BooleanField | No | False | — | Primary vehicle for this driver's salary calc |
| assigned_at | DateTimeField | No | auto_now_add | — | Set on creation; same value as created_at |
| unassigned_at | DateTimeField | Yes | — | — | NULL = currently active assignment |
| created_at | DateTimeField | No | auto_now_add | — | Duplicate of assigned_at; both stored |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| driver | belongs_to | Driver | driver_id | CASCADE | |
| vehicle | belongs_to | Vehicle | vehicle_id | CASCADE | |

## Indexes
- `(driver_id, vehicle_id)` — unique_together constraint; prevents duplicate active assignments
- `assigned_at` — ordering field; no explicit index

## Validations & business rules
- `unique_together = ['driver', 'vehicle']` — a driver–vehicle pair can appear only once; to reassign after unassignment, the existing record must be reactivated or a new one created (current code doesn't handle re-assignment after unassign)
- Active assignment = `unassigned_at IS NULL`
- `is_primary=True` marks the vehicle used for salary fallback in `Driver.get_effective_base_salary()`
- `VehicleAssignDriverSerializer` validates that the driver_id belongs to an active driver

## State / status (if applicable)
- Active: `unassigned_at IS NULL`
- Unassigned: `unassigned_at IS NOT NULL` (set via `unassign()` method which also sets `is_primary=False`)

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| POST | /api/v1/vehicles/{id}/assign-driver/ | Create a new mapping (assign driver to vehicle) | Owner/Coordinator |
| POST | /api/v1/vehicles/{id}/create-driver/ | Create driver account + assign in one step | Owner/Coordinator |

## Lifecycle hooks / side effects
- `unassign()` sets `unassigned_at = now()` and `is_primary = False` and calls `save(update_fields=[...])`
- No signals or downstream effects when assignment changes

## Open questions / known limitations
- `assigned_at` and `created_at` are redundant — both set to `auto_now_add`; only `assigned_at` semantically makes sense
- `unique_together` on `(driver, vehicle)` means a driver who was unassigned from a vehicle can never be re-assigned to the same vehicle (the unique constraint would block a second row for the same pair)
- No endpoint to explicitly unassign a driver from a vehicle; `unassigned_at` mechanism exists but is not exposed via API
- No constraint prevents a driver from having two `is_primary=True` records simultaneously (e.g. if assigned to two vehicles both marked primary)
