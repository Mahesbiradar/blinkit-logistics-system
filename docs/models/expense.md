# Expense

## Purpose
Tracks all cash outflows associated with operations: fuel, toll, driver advances, allowances, vehicle maintenance, and company/management overhead. Each expense can be linked to a driver, a vehicle, and optionally a specific trip. The `expense_type` determines how the expense is treated in payment calculations — some are deducted from driver salary, some from vendor settlement, and toll is never deducted (Blinkit reimburses the owner directly).

## Source files
- Model: backend/apps/expenses/models.py
- Migration/Schema: backend/apps/expenses/migrations/ (0001_initial, 0002_nullable_company_management)
- Controller/Service: backend/apps/expenses/views.py
- Routes: backend/apps/expenses/urls.py
- Validators: backend/apps/expenses/serializers.py (`ExpenseWriteSerializer`)
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| driver | ForeignKey → drivers.Driver | Yes | — | CASCADE on delete | Null for vehicle-only or company expenses |
| vehicle | ForeignKey → vehicles.Vehicle | Yes | — | CASCADE on delete | Null for company_management type |
| trip | ForeignKey → trips.Trip | Yes | — | SET_NULL on delete | Optional link to specific trip |
| expense_type | CharField(20) | No | — | choices (7 values) | See choices below |
| amount | DecimalField(10,2) | No | — | — | Validated > 0 in serializer |
| expense_date | DateField | No | — | — | Cannot be in the future (serializer) |
| description | TextField | No | `''` | blank=True | Free-text notes |
| receipt_image | ImageField | Yes | — | upload_to='expenses/receipts/%Y/%m/' | Optional photo of receipt |
| payment_mode | CharField(20) | No | `''` | choices (7 values), blank=True | How the expense was paid |
| is_blinkit_reimbursable | BooleanField | No | False | — | Auto-set True for toll type |
| is_deducted | BooleanField | No | False | — | Tracks if advance has been deducted from payment |
| deducted_at | DateTimeField | Yes | — | — | Set by `mark_deducted()` |
| created_by | ForeignKey → accounts.User | Yes | — | SET_NULL on delete | Auto-set to request.user; no related_name |
| created_at | DateTimeField | No | auto_now_add | — | |
| updated_at | DateTimeField | No | auto_now | — | |

**expense_type choices:** `fuel`, `toll`, `advance`, `allowance`, `maintenance`, `other`, `company_management`

**payment_mode choices:** `cash`, `phonepay`, `gpay`, `paytm`, `upi`, `card`, `other`

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| driver | belongs_to | drivers.Driver | driver_id | CASCADE | Null for company/vehicle-only expenses |
| vehicle | belongs_to | vehicles.Vehicle | vehicle_id | CASCADE | Null for company_management expenses |
| trip | belongs_to | trips.Trip | trip_id | SET_NULL | Trip deletion nulls this FK, not vice versa |
| created_by | belongs_to | accounts.User | created_by_id | SET_NULL | No related_name defined |

## Indexes
- `(driver_id, expense_date)` — composite index
- `(vehicle_id, expense_date)` — composite index
- `expense_type` — single-column index
- `expense_date` — single-column index
- `is_deducted` — single-column index

## Validations & business rules
- `amount` must be > 0 (serializer)
- `expense_date` cannot be in the future (serializer)
- For `toll` type: serializer auto-sets `is_blinkit_reimbursable = True`
- For `company_management` type: driver and vehicle are both optional (expense is not linked to either)
- For driver role: serializer prevents logging expenses for other drivers; `company_management` type is forbidden for drivers
- `is_deducted` is relevant only for `advance` type; it is set to True when the payment that deducts the advance is marked as paid
- Payment deduction logic in `Payment.mark_paid()` queries advances for the month with `is_deducted=False` and calls `mark_deducted()` on each

**Payment formula reference:**
- Owner vehicle salary: `Base Salary - advance` (only advance is deducted from driver)
- Vendor settlement: `(KM × rate) - fuel - advance - allowance - maintenance - other` (toll excluded)
- `company_management` expenses are tracked separately and do not affect either formula

## State / status (if applicable)
- `is_deducted`: False (default) → True (set when payment is marked paid). Only meaningful for `expense_type='advance'`.

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| GET | /api/v1/expenses/ | List expenses (filter: driver_id, vehicle_id, expense_type, start_date, end_date, is_deducted) | Any authenticated |
| POST | /api/v1/expenses/ | Create expense | Any authenticated |
| GET | /api/v1/expenses/{id}/ | Expense detail | Any authenticated |
| PUT/PATCH | /api/v1/expenses/{id}/ | Update expense | Any authenticated |
| DELETE | /api/v1/expenses/{id}/ | Delete expense | Any authenticated |
| GET | /api/v1/expenses/my-expenses/ | Driver's own expenses + advance summary | Driver |

## Lifecycle hooks / side effects
- `mark_deducted()` sets `is_deducted=True` and `deducted_at=now()` via `save(update_fields=[...])`; called from `Payment.mark_paid()`
- No signals; no background jobs

## Open questions / known limitations
- `company_management` expenses have no driver or vehicle — they are fleet-level overhead but appear in the same expense list with no clear grouping or reporting path beyond the dedicated Excel report
- `is_deducted` is set by `Payment.mark_paid()` for advances in the payment month — but advances taken in different months (e.g. December advance carried into January payment) are not handled; only same-month advances are deducted
- `created_by` FK has no `related_name`, so reverse access from User → Expense is unavailable via the ORM
- No constraint prevents a driver from logging an advance with `is_deducted=True` at creation time (it defaults False but nothing prevents overriding)
- The `is_blinkit_reimbursable` flag is auto-set for toll in serializer but nothing prevents manually setting it for other types — there is no validation that only toll can be reimbursable
