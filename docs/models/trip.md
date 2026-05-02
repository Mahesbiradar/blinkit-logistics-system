# Trip

## Purpose
Records a driver's daily dispatch activity. One Trip document covers up to two sub-trips (Trip 1 and Trip 2) on a single date, each going from the main warehouse (B3 WH) to a Blinkit store. Adhoc trips (hired/on-demand vehicles) use free-text driver/vehicle fields instead of FKs. Trips must be approved before KM counts toward salary/vendor calculations.

## Source files
- Model: backend/apps/trips/models.py
- Migration/Schema: backend/apps/trips/migrations/ (0001_initial, 0002_store_trip_category, 0003_seed_stores)
- Controller/Service: backend/apps/trips/views.py
- Routes: backend/apps/trips/urls.py
- Validators: backend/apps/trips/serializers.py (`TripCreateSerializer`, `TripUpdateSerializer`)
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| driver | ForeignKey → drivers.Driver | Yes | — | CASCADE on delete | Null for adhoc trips |
| vehicle | ForeignKey → vehicles.Vehicle | Yes | — | CASCADE on delete | Null for adhoc trips |
| adhoc_vehicle_number | CharField(50) | No | `''` | blank=True | Free-text; populated only for adhoc |
| adhoc_driver_name | CharField(200) | No | `''` | blank=True | Free-text; populated only for adhoc |
| adhoc_driver_phone | CharField(20) | No | `''` | blank=True | Free-text; no format validation |
| trip_date | DateField | No | — | — | Cannot be in the future (serializer) |
| warehouse | CharField(50) | No | `'B3 WH'` | — | Always B3 WH currently; no enum constraint |
| trip_category | CharField(20) | No | `'regular'` | choices: regular/adhoc | |
| created_by | ForeignKey → accounts.User | Yes | — | SET_NULL on delete | Auto-set to request.user |
| dispatch_time_1 | TimeField | Yes | — | — | Trip 1 departure time |
| store_name_1 | CharField(200) | No | `''` | blank=True | Store name copied from Store master |
| one_way_km_1 | DecimalField(8,2) | Yes | — | — | One-way KM; system doubles for round trip |
| dispatch_time_2 | TimeField | Yes | — | — | Trip 2 departure time |
| store_name_2 | CharField(200) | No | `''` | blank=True | Empty if no second sub-trip |
| one_way_km_2 | DecimalField(8,2) | Yes | — | — | Null if no second sub-trip |
| total_km | DecimalField(8,2) | No | 0 | — | Auto-calculated: (km1 × 2) + (km2 × 2) via `save()` |
| gate_pass_image | ImageField | Yes | — | upload_to='trips/gate_pass/%Y/%m/' | Trip 1 gate pass photo |
| map_screenshot | ImageField | Yes | — | upload_to='trips/maps/%Y/%m/' | Trip 1 Google Maps screenshot |
| gate_pass_image_2 | ImageField | Yes | — | upload_to='trips/gate_pass/%Y/%m/' | Trip 2 gate pass photo |
| map_screenshot_2 | ImageField | Yes | — | upload_to='trips/maps/%Y/%m/' | Trip 2 map screenshot |
| status | CharField(20) | No | `'pending'` | choices: pending/approved/rejected | |
| approved_by | ForeignKey → accounts.User | Yes | — | SET_NULL on delete | Same field used for rejection actor |
| approved_at | DateTimeField | Yes | — | — | Timestamp of approval or rejection |
| rejection_reason | TextField | No | `''` | blank=True | Required in `TripRejectionSerializer` |
| remarks | TextField | No | `''` | blank=True | Driver notes |
| created_at | DateTimeField | No | auto_now_add | — | |
| updated_at | DateTimeField | No | auto_now | — | |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| driver | belongs_to | drivers.Driver | driver_id | CASCADE | Null for adhoc |
| vehicle | belongs_to | vehicles.Vehicle | vehicle_id | CASCADE | Null for adhoc |
| created_by | belongs_to | accounts.User | created_by_id | SET_NULL | Who entered the trip |
| approved_by | belongs_to | accounts.User | approved_by_id | SET_NULL | Who approved or rejected |
| expenses | has_many (reverse) | Expense | Expense.trip | SET_NULL | Trip-linked expenses; FK nulled if trip deleted |

## Indexes
- `(driver_id, trip_date)` — composite index
- `(vehicle_id, trip_date)` — composite index
- `status` — single-column index
- `trip_date` — single-column index

## Validations & business rules
- `trip_date` cannot be in the future (serializer check)
- At least one sub-trip must have both `store_name` and `one_way_km` (cannot submit empty trip)
- If `one_way_km_1` is provided, `store_name_1` is required and vice-versa (same for trip 2)
- `one_way_km` values must be > 0
- For driver role: serializer auto-sets `driver` and `vehicle` from the driver's active assignment; driver cannot set arbitrary driver/vehicle
- For adhoc `trip_category`: `adhoc_vehicle_number` and `adhoc_driver_name` are required; FK driver/vehicle are not required
- `total_km` is recalculated on every `save()` call via the overridden `save()` method — it cannot be set manually
- Trips created by admin/coordinator are auto-approved (status='approved') — this is stated in project memory but should be verified in view code
- `approved_by` is used for both approval and rejection actor (no separate `rejected_by` field)

## State / status (if applicable)
```
pending → approved  (via TripApproveView; sets approved_by, approved_at)
pending → rejected  (via TripRejectView; sets approved_by, approved_at, rejection_reason)
```
No transitions out of approved or rejected (no re-open or re-review).

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| GET | /api/v1/trips/ | List trips (filter: status, driver_id, vehicle_id, start_date, end_date) | Any authenticated |
| POST | /api/v1/trips/ | Create trip | Any authenticated |
| GET | /api/v1/trips/{id}/ | Trip detail | Any authenticated |
| PUT/PATCH | /api/v1/trips/{id}/ | Update trip | Any authenticated |
| DELETE | /api/v1/trips/{id}/ | Delete trip | Any authenticated |
| POST | /api/v1/trips/{id}/approve/ | Approve trip | Owner/Coordinator |
| POST | /api/v1/trips/{id}/reject/ | Reject trip with reason | Owner/Coordinator |
| GET | /api/v1/trips/my-trips/ | Driver's own trips | Driver |
| GET | /api/v1/trips/pending/ | All pending trips | Owner/Coordinator |
| GET | /api/v1/trips/stats/ | Aggregate stats for date range | Owner/Coordinator |

## Lifecycle hooks / side effects
- `save()` recalculates `total_km` on every write
- `approve()` and `reject()` are model methods using `save(update_fields=[...])` for partial updates
- Approved trip KM flows into Payment calculation (queried at payment-calc time, not denormalised)

## Open questions / known limitations
- `store_name_1` / `store_name_2` are free-text strings, not FKs to Store — no referential integrity; a typo creates a new de-facto store name in trip history
- `approved_by` stores both the approver and the rejector — no way to distinguish who rejected vs approved from the field name alone (need to check `status`)
- No constraint prevents two trips for the same driver on the same date (beyond the 2-trip-per-day business rule) — the rule is documented but not enforced in DB or serializer
- `trip_category='adhoc'` uses free-text fields instead of FK; these adhoc drivers/vehicles are completely invisible to the driver/vehicle management screens
- Image storage defaults to local filesystem; S3 is optionally enabled via `USE_S3` env var but not set up in Docker Compose by default
- Deleting a Trip sets `Expense.trip = NULL` (SET_NULL) rather than cascading — expense records survive trip deletion
