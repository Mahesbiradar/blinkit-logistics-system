# Payment

## Purpose
Represents a monthly salary calculation for an owner-vehicle driver, or a monthly settlement for a vendor. Acts as a snapshot: totals from trips and expenses are copied in at calculation time and stored as denormalized fields. Once marked paid, downstream advances are flagged as deducted.

## Source files
- Model: backend/apps/payments/models.py
- Migration/Schema: backend/apps/payments/migrations/0001_initial.py
- Controller/Service: backend/apps/payments/views.py
- Routes: backend/apps/payments/urls.py
- Validators: backend/apps/payments/serializers.py
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| driver | ForeignKey → drivers.Driver | Yes | — | CASCADE on delete | Set for salary payments |
| vehicle | ForeignKey → vehicles.Vehicle | Yes | — | CASCADE on delete | Set for vendor payments |
| vendor | ForeignKey → vehicles.Vendor | Yes | — | CASCADE on delete | Set for vendor payments |
| payment_type | CharField(20) | No | — | choices: salary/vendor_payment/advance/reimbursement | |
| month_year | DateField | No | — | — | First day of the payment month (e.g. 2026-05-01) |
| total_trips | IntegerField | No | 0 | — | Approved trip count for the period |
| total_km | DecimalField(10,2) | No | 0 | — | Total approved KM for the period |
| km_rate | DecimalField(10,2) | No | 0 | — | Snapshot of vehicle.km_rate at calculation time |
| km_amount | DecimalField(10,2) | No | 0 | — | total_km × km_rate; calculated by `calculate_totals()` |
| base_salary | DecimalField(10,2) | No | 0 | — | Snapshot of driver effective base salary |
| total_fuel_expenses | DecimalField(10,2) | No | 0 | — | Sum of fuel expenses for the month |
| total_advance | DecimalField(10,2) | No | 0 | — | Sum of undeducted advances for the month |
| total_toll_expenses | DecimalField(10,2) | No | 0 | — | Recorded but NOT deducted from either formula |
| total_allowance | DecimalField(10,2) | No | 0 | — | Sum of allowance expenses |
| other_deductions | DecimalField(10,2) | No | 0 | — | maintenance + other combined for vendor |
| gross_amount | DecimalField(10,2) | No | 0 | — | base_salary (salary) or km_amount (vendor) |
| total_deductions | DecimalField(10,2) | No | 0 | — | Sum of applicable deductions by type |
| final_amount | DecimalField(10,2) | No | 0 | — | gross_amount − total_deductions |
| status | CharField(20) | No | `'pending'` | choices: pending/processed/paid | |
| paid_at | DateTimeField | Yes | — | — | Set by `mark_paid()` |
| paid_by | ForeignKey → accounts.User | Yes | — | SET_NULL on delete | Who marked the payment paid |
| payment_mode | CharField(20) | No | `''` | blank=True | How payment was made (free text) |
| transaction_reference | CharField(100) | No | `''` | blank=True | UPI/bank reference number |
| remarks | TextField | No | `''` | blank=True | |
| created_at | DateTimeField | No | auto_now_add | — | |
| updated_at | DateTimeField | No | auto_now | — | |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| driver | belongs_to | drivers.Driver | driver_id | CASCADE | Present for salary type |
| vehicle | belongs_to | vehicles.Vehicle | vehicle_id | CASCADE | Present for vendor_payment type |
| vendor | belongs_to | vehicles.Vendor | vendor_id | CASCADE | Present for vendor_payment type |
| paid_by | belongs_to | accounts.User | paid_by_id | SET_NULL | No related_name defined |

## Indexes
- `(driver_id, month_year)` — composite index
- `(vehicle_id, month_year)` — composite index
- `(vendor_id, month_year)` — composite index
- `status` — single-column index
- `month_year` — single-column index

## Validations & business rules
- `PaymentCreateSerializer` requires either `driver_id` or `vendor_id` (not both, not neither)
- `calculate_totals()` selects formula based on `payment_type`:
  - **salary**: `gross = base_salary`, `deductions = advance + other_deductions`, toll/fuel/allowance recorded but NOT deducted
  - **vendor_payment**: `gross = km × km_rate`, `deductions = fuel + advance + allowance + maintenance + other`, toll NOT deducted
- `calculate_driver_salary()` and `calculate_vendor_payment()` are class methods that query live trip/expense data and return a preview dict; the preview is then saved as a Payment record
- `month_year` stores only the first day of the month (e.g. 2026-05-01 for May 2026)
- All financial fields default to 0 and are populated either by the calculate class methods or directly from the preview API

## State / status (if applicable)
```
pending → processed  (intermediate state; not clearly enforced by any endpoint)
pending → paid       (via PaymentMarkPaidView; sets paid_at, paid_by, payment_mode, reference)
processed → paid     (same endpoint)
```
- On transition to `paid`: `Payment.mark_paid()` queries all undeducted advances for driver in that month and calls `Expense.mark_deducted()` on each.

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| GET | /api/v1/payments/ | List payments (filter: status, payment_type, driver, vendor, month_year) | Owner/Coordinator |
| POST | /api/v1/payments/ | Create payment record | Owner/Coordinator |
| POST | /api/v1/payments/calculate/ | Preview calculation without saving | Owner/Coordinator |
| GET | /api/v1/payments/{id}/ | Payment detail | Owner/Coordinator |
| POST | /api/v1/payments/{id}/mark-paid/ | Mark payment as paid | Owner/Coordinator |

## Lifecycle hooks / side effects
- `mark_paid()` triggers `Expense.mark_deducted()` for all undeducted advances for the driver in the payment month
- No signals; side effects are synchronous in the `mark_paid()` method

## Open questions / known limitations
- `driver` and `vehicle` and `vendor` can all be set on the same Payment row — there is no DB constraint preventing an invalid combination (e.g. salary payment with a vendor_id also set)
- `total_toll_expenses` is stored for informational purposes but is NOT included in deductions in either formula — if the formula ever changes, this field needs to be updated in multiple places
- `processed` status exists but no API endpoint transitions a payment to `processed`; all transitions go pending → paid
- `advance` and `reimbursement` payment_types exist in choices but `calculate_driver_salary` and `calculate_vendor_payment` only handle `salary` and `vendor_payment`; the other types have no calculation logic
- Advance deduction in `mark_paid()` only covers same-month advances (filters `expense_date__month` and `expense_date__year` matching `month_year`) — carry-forward advances are silently skipped
- `paid_by` has no `related_name`, so reverse ORM access from User → Payment is unavailable
