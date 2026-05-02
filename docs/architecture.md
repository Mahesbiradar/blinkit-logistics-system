# Architecture Overview

## Overall data flow

```
HTTP Request
    │
    ▼
Django Middleware (CORS → JWT auth → throttle)
    │
    ▼
URL Router (config/urls.py → apps/*/urls.py)
    │
    ▼
View / ViewSet (apps/*/views.py)
    │  reads request.user (set by JWTAuthentication)
    │  checks permission class (IsOwner / IsCoordinator / IsDriver / etc.)
    ▼
Serializer (apps/*/serializers.py)
    │  validate_<field>()  →  field-level rules
    │  validate()          →  cross-field rules + business logic
    │  create() / update() →  atomic DB writes
    ▼
Django ORM → PostgreSQL
    │
    ▼
StandardJSONRenderer wraps response:
    {"status": "success", "data": {...}, "message": "..."}
```

Image uploads: `MultiPartParser` accepts files → stored to local filesystem (or S3 if `USE_S3=true`) under dated paths.

Report generation (reports app): view queries ORM → builds openpyxl workbook or reportlab PDF → returns `FileResponse` (binary stream, not JSON).

## How models relate to each other

```
User ──1:1──► Driver ──M:M──► Vehicle ◄──── Vendor
                │   (via DriverVehicleMapping)   │
                │                               │
                ▼                               ▼
              Trip ◄────────────────────── Vehicle
                                               │
                                               ├──► Expense (vehicle FK, 12 types)
                                               │      └── fastag_recharge type feeds FastagRecord.save()
                                               │
                                               ├──► FastagRecord  ← standalone Fastag ledger
                                               │      (no link to VehicleSettlement)
                                               │
                                               └──► VehicleSettlement  ← monthly closing doc
                                                      calculate() reads ALL Expense rows for vehicle+month

CompanyExpense  ← standalone (no vehicle FK)

User ──► Trip.created_by / Trip.approved_by
User ──► VehicleSettlement.paid_by / created_by
User ──► Expense.created_by
User ──► FastagRecord.created_by / updated_by
User ──► CompanyExpense.created_by

Store  (standalone master; name copied into Trip.store_name_1/2 as string)
OTPCode (standalone; linked to User by phone string, not FK)
```

**Key independence rule:** FastagRecord ↔ VehicleSettlement have zero FK between them.
FastagRecord tracks Fastag account balance. VehicleSettlement tracks vehicle payment.
The only shared data is that `fastag_recharge` Expense rows appear in both
(FastagRecord.save() aggregates them; VehicleSettlement.calculate() includes them in total_expenses).

**FK summary:**

| From | Field | To | On delete |
|------|-------|----|-----------|
| Driver | user | User | CASCADE |
| DriverVehicleMapping | driver | Driver | CASCADE |
| DriverVehicleMapping | vehicle | Vehicle | CASCADE |
| Vehicle | vendor | Vendor | SET_NULL |
| Trip | driver | Driver | CASCADE |
| Trip | vehicle | Vehicle | CASCADE |
| Trip | created_by | User | SET_NULL |
| Trip | approved_by | User | SET_NULL |
| Expense | vehicle | Vehicle | CASCADE |
| Expense | created_by | User | SET_NULL (related_name='expenses_created') |
| FastagRecord | vehicle | Vehicle | CASCADE |
| FastagRecord | created_by | User | SET_NULL (related_name='fastag_records_created') |
| FastagRecord | updated_by | User | SET_NULL (related_name='fastag_records_updated') |
| VehicleSettlement | vehicle | Vehicle | CASCADE |
| VehicleSettlement | paid_by | User | SET_NULL (related_name='settlements_paid') |
| VehicleSettlement | created_by | User | SET_NULL (related_name='settlements_created') |
| CompanyExpense | created_by | User | SET_NULL (related_name='company_expenses_created') |

## Cross-cutting concerns

**Authentication:**
- Custom `JWTAuthentication` reads `Authorization: Bearer <token>` header
- Token payload includes: `user_id`, `phone`, `role`, `type` (access/refresh/registration)
- Registration tokens (10 min) issued after OTP verification for drivers who haven't completed signup
- All views default to `IsAuthenticated`; endpoints relax or restrict via explicit `permission_classes`

**Role enforcement:**
- Permission classes in `apps/common/permissions.py`: `IsOwner`, `IsCoordinator`, `IsOwnerOrCoordinator`, `IsDriver`
- Driver role is further restricted inside serializers (e.g. can only write own trips, cannot use `company_management` expense type)

**Throttling:**
- Anonymous: 10 req/min
- Authenticated: 100 req/min
- OTP endpoints: 5 req/min (custom throttle class)

**Pagination:**
- `StandardPagination`: 20 items/page, configurable via `?page=` and `?page_size=`

**Response envelope:**
- `StandardJSONRenderer` wraps every response: `{"status": "success"|"error", "data": ..., "message": ...}`
- DRF validation errors pass through as `{"status": "error", "data": {"field": ["msg"]}, ...}`

**Transactions:**
- `DriverCreateSerializer.create()` uses `transaction.atomic()` to wrap User + Driver creation + vehicle mapping
- No other explicit transactions found; other multi-step operations are not wrapped

**File storage:**
- Default: local filesystem under `MEDIA_ROOT`
- Optional S3: `USE_S3=true` env var enables `django-storages` S3Boto3; not configured in Docker Compose by default

**Logging:** Not implemented (no logging configuration found in settings or views).

**Error handling:** DRF default exception handler; no custom exception handler registered.

## What a new model needs to integrate with

1. **UUID primary key** — every model uses `UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
2. **Explicit `db_table`** — set `Meta.db_table = '<table_name>'` to avoid Django's default `appname_modelname` pattern
3. **`created_at` / `updated_at`** — `auto_now_add` / `auto_now`; present on every model
4. **`is_active` soft-delete** — list views filter by `is_active=True` by default; add the field and filter for consistency
5. **Permission class** — select from `IsOwner`, `IsOwnerOrCoordinator`, `IsDriver`, `IsAuthenticated`; avoid mixing in unexpected ways
6. **Serializer validation** — put all business rules in `validate()` or `validate_<field>()`; do not add them to model `save()`
7. **Money fields** — use `DecimalField(max_digits=10, decimal_places=2)` (existing convention); no `MoneyValidator` utility exists
8. **Image fields** — use `ImageField(upload_to='<app>/<subfolder>/%Y/%m/', null=True, blank=True)`; requires Pillow
9. **Response shape** — do not return raw model data; always go through a serializer so `StandardJSONRenderer` wraps it correctly
10. **Indexes** — add explicit `Meta.indexes` for any FK + date composite query (see Trip and Expense as examples)

## URL mount points (current)

| Prefix | App | Notes |
|--------|-----|-------|
| /api/v1/expenses/ | apps.expenses.urls | Expense + FastagRecord |
| /api/v1/company-expenses/ | apps.expenses.company_expense_urls | CompanyExpense |
| /api/v1/settlements/ | apps.payments.urls | VehicleSettlement (replaces /api/v1/payments/) |
| /api/v1/payments/ | **removed** | Old Payment model deleted |

## Inconsistencies to resolve

1. **`base_salary` exists on both Driver and Vehicle.** The priority logic (`Driver.get_effective_base_salary()` prefers driver's own value) is invisible to the UI. A future Expense or Salary model that reads salary must call this method — calling `driver.base_salary` directly is a bug.

2. **Trip stores store name as a string, not a FK.** `Trip.store_name_1` / `store_name_2` are denormalized strings copied from `Store.name`. Renaming or deactivating a Store has zero effect on historical trips. A future reporting model that joins trips to stores by name will fail on name changes.

3. **`approved_by` is overloaded.** `Trip.approved_by` stores the actor for both approval and rejection. There is no `rejected_by` field. Code consuming this field must also check `Trip.status`.

4. **Advance deduction is month-scoped only.** `Payment.mark_paid()` only marks advances as deducted if `expense_date` falls in the same month as `month_year`. Carry-forward advances (e.g. advance given in April, salary processed in May) are silently excluded from deduction.

5. **`Payment.vendor` uses CASCADE but `Vehicle.vendor` uses SET_NULL.** Deleting a Vendor cascades to delete all its Payment rows but only nulls the FK on its Vehicle rows. This is an asymmetric and potentially destructive on-delete policy.

6. **`Store` creation permission is `IsAuthenticated`.** The intent appears to be owner/coordinator only, but the permission class allows drivers to create stores. This is inconsistent with all other master-data creation endpoints.

7. **`payment_type` choices `advance` and `reimbursement` have no calculation logic.** `Payment.calculate_driver_salary()` and `calculate_vendor_payment()` only handle `salary` and `vendor_payment`. The other two types exist in the DB schema but are dead code.

8. **No `related_name` on `Expense.created_by` and `Payment.paid_by`.** Reverse ORM access (e.g. `user.expenses_created`) is unavailable; the missing related_names also create a clash if another model adds a FK to User without a related_name.
