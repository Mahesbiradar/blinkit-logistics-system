# Vendor

## Purpose
Represents a third-party vehicle owner who supplies hired vehicles to the operation. Vendor records are needed for monthly settlement calculations — the vendor receives payment based on total KM driven by their vehicles minus deductible expenses.

## Source files
- Model: backend/apps/vehicles/models.py
- Migration/Schema: backend/apps/vehicles/migrations/0001_initial.py
- Controller/Service: backend/apps/vehicles/views.py
- Routes: backend/apps/vehicles/urls.py
- Validators: backend/apps/vehicles/serializers.py
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| name | CharField(200) | No | — | — | Company or individual name; not unique |
| phone | CharField(15) | No | — | — | Not validated for format; not unique |
| email | EmailField | Yes | — | — | Optional contact email |
| address | TextField | No | `''` | blank=True | |
| contact_person | CharField(100) | No | `''` | blank=True | Named contact at vendor |
| is_active | BooleanField | No | True | — | Soft-delete flag |
| created_at | DateTimeField | No | auto_now_add | — | |
| updated_at | DateTimeField | No | auto_now | — | |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| vehicles | has_many (reverse) | Vehicle | Vehicle.vendor | SET_NULL | A vendor's fleet; FK nulled if vendor deleted |
| payments | has_many (reverse) | Payment | Payment.vendor | CASCADE | Monthly settlements |

## Indexes
- `name` — ordering field; no explicit index

## Validations & business rules
- No unique constraint on `name` or `phone` — duplicate vendor records can be created
- Vendor is required when creating a Vehicle with `owner_type='vendor'` (enforced in `VehicleWriteSerializer`)
- Deleting a Vendor sets `Vehicle.vendor = NULL` (SET_NULL) but does not affect trips or expenses
- `get_total_km_this_month()` aggregates KM across all vendor vehicles from approved trips

## State / status (if applicable)
- `is_active`: True → False. No transition logic; filtered in list views by default.

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| GET | /api/v1/vehicles/vendors/ | List vendors | Owner/Coordinator |
| POST | /api/v1/vehicles/vendors/ | Create vendor | Owner/Coordinator |
| GET | /api/v1/vehicles/vendors/{id}/ | Vendor detail | Owner/Coordinator |
| PUT/PATCH | /api/v1/vehicles/vendors/{id}/ | Update vendor | Owner/Coordinator |
| DELETE | /api/v1/vehicles/vendors/{id}/ | Delete vendor | Owner/Coordinator |

## Lifecycle hooks / side effects
- None; no signals or background effects on save/delete.

## Open questions / known limitations
- No uniqueness constraint on name or phone — easy to create duplicate vendors by mistake
- Deleting a vendor does not cascade to payments (CASCADE on Payment.vendor means payments would also be deleted — this is inconsistent with the SET_NULL behavior on Vehicle.vendor); double-check migration
- `get_total_km_this_month()` does a cross-table join at the method level; not used in any serializer currently (potential N+1 if called in a loop)
