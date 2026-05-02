# Store

## Purpose
Master list of Blinkit delivery store destinations. Pre-seeded with 55 stores from the April 2026 Excel master. Drivers search and select stores when logging a trip; the store name is then copied as a string into `Trip.store_name_1` / `Trip.store_name_2` — there is no FK from Trip to Store.

## Source files
- Model: backend/apps/trips/models.py
- Migration/Schema: backend/apps/trips/migrations/0002_store_trip_category.py (schema); backend/apps/trips/migrations/0003_seed_stores.py (seed data)
- Controller/Service: backend/apps/trips/views.py (`StoreListCreateView`, `StoreDetailView`)
- Routes: backend/apps/trips/urls.py
- Validators: backend/apps/trips/serializers.py (`StoreSerializer`)
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| name | CharField(200) | No | — | unique=True | Full store name e.g. "Tubrahalli ES-131" |
| code | CharField(20) | No | `''` | blank=True | Store code e.g. "ES-131"; not enforced unique |
| area | CharField(100) | No | `''` | blank=True | Neighbourhood/area e.g. "Tubrahalli" |
| is_active | BooleanField | No | True | — | Inactive stores hidden from search |
| created_at | DateTimeField | No | auto_now_add | — | |
| updated_at | DateTimeField | No | auto_now | — | |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| (none) | — | Trip | string copy (store_name_1/2) | N/A | Name is denormalised into Trip; no FK |

## Indexes
- `name` — unique index (from `unique=True`)
- `name` — ordering field (alphabetical)

## Validations & business rules
- `name` must be unique — prevents duplicate store entries
- Search endpoint (`GET /api/v1/trips/stores/?q=`) filters by `name__icontains` for debounced dropdown
- Owner/coordinator can create new stores via `POST /api/v1/trips/stores/`; drivers can search but creation permission is Unknown (view uses `IsAuthenticated` — may allow drivers)
- Store name is copied by value into Trip fields at trip creation time — renaming a store does not update historical trips

## State / status (if applicable)
- `is_active`: True → False. Inactive stores are filtered from the search dropdown but remain in historical trip records (since Trip stores the name as a string).

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| GET | /api/v1/trips/stores/ | List/search stores (?q= for search) | Any authenticated |
| POST | /api/v1/trips/stores/ | Create new store | Any authenticated (see open questions) |
| GET | /api/v1/trips/stores/{id}/ | Store detail | Any authenticated |
| PATCH | /api/v1/trips/stores/{id}/ | Update store | Any authenticated |

## Lifecycle hooks / side effects
- None; no signals. 55-store seed is applied via Django data migration (0003_seed_stores.py).

## Open questions / known limitations
- Trip stores store name as a free-text string (not FK) — there is no referential integrity; renaming a store or deleting it has no effect on existing trips
- `code` field is not enforced unique — two stores could have the same code (e.g. "ES-131")
- `StoreListCreateView` uses `IsAuthenticated` permission — it is unclear whether drivers should be allowed to create new stores; this may be an oversight
- No admin UI for Store management is implemented in the frontend (listed as PENDING in build status)
