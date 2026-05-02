# Expense

## Purpose
Running payment ledger for every rupee JJR sends out for a specific vehicle during a month.
Every row is money-already-paid — at settlement time ALL expenses for a vehicle+month are
summed and deducted from gross. There is no per-row "deductible" flag.

## Source files
- Model:      backend/apps/expenses/models.py
- Migration:  backend/apps/expenses/migrations/
- Views:      backend/apps/expenses/views.py
- Routes:     backend/apps/expenses/urls.py
- Serializer: backend/apps/expenses/serializers.py
- Tests:      none

## Fields
| Field           | Type                        | Nullable | Default | Constraints            | Notes                                              |
|-----------------|-----------------------------|----------|---------|------------------------|----------------------------------------------------|
| id              | UUIDField                   | No       | uuid4   | PK, editable=False     |                                                    |
| vehicle         | FK → vehicles.Vehicle       | No       | —       | CASCADE                | Every expense belongs to a vehicle                 |
| expense_date    | DateField                   | No       | —       | —                      | Cannot be future (serializer)                      |
| expense_time    | TimeField                   | Yes      | —       | —                      | Coordinator logs time when available               |
| expense_type    | CharField(30)               | No       | —       | choices (12 values)    | See table below                                    |
| amount          | DecimalField(10,2)          | No       | —       | —                      | Must be > 0 (serializer)                           |
| payment_mode    | CharField(20)               | No       | —       | choices (6 values)     | phonepay/kiwi/amazon_pay/whatsapp/cash/other       |
| paid_to_name    | CharField(200)              | No       | ''      | blank=True             | "Saptagiri Service Station", "Mantayya"            |
| paid_to_number  | CharField(50)               | No       | ''      | blank=True             | Phone / scanner / account number                   |
| month_year      | DateField                   | No       | —       | —                      | First day of settlement month (e.g. 2026-04-01)   |
| remarks         | TextField                   | No       | ''      | blank=True             |                                                    |
| receipt_image   | ImageField                  | Yes      | —       | upload_to='expenses/receipts/%Y/%m/' |                                    |
| created_by      | FK → accounts.User          | Yes      | —       | SET_NULL, related_name='expenses_created' | Auto-set to request.user         |
| created_at      | DateTimeField               | No       | auto_now_add | —                 |                                                    |
| updated_at      | DateTimeField               | No       | auto_now    | —                  |                                                    |

### expense_type choices
| Value           | Real-world meaning                                           |
|-----------------|--------------------------------------------------------------|
| diesel          | Fuel paid to petrol pump (via Kiwi scanner usually)         |
| driver_advance  | Cash advance to driver (personal needs, fines, etc.)        |
| driver_payment  | Monthly salary / driver PM payment                          |
| emi             | Vehicle loan EMI paid by JJR on driver's behalf             |
| fastag_recharge | Amount topped up into vehicle Fastag tag                    |
| adhoc_driver    | Payment to substitute driver covering absent primary driver |
| repair          | Mechanical work — clutch plate, tyres, servicing, etc.      |
| accident        | Accident-related payments                                    |
| fine            | Traffic fine / wrong-route fine                             |
| food            | Driver meal expenses                                        |
| penalty         | Blinkit absent penalty paid directly from JJR pocket        |
| other           | Everything else (fan, FC renewal, etc.)                     |

### payment_mode choices
`phonepay`, `kiwi`, `amazon_pay`, `whatsapp`, `cash`, `other`

## Relationships
| Relation   | Type        | Target           | FK         | On delete | Notes                          |
|------------|-------------|------------------|------------|-----------|--------------------------------|
| vehicle    | belongs_to  | Vehicle          | vehicle_id | CASCADE   | Required on every expense      |
| created_by | belongs_to  | accounts.User    | created_by_id | SET_NULL | related_name='expenses_created' |

## Indexes
- `(vehicle_id, month_year)` — composite; primary query pattern
- `(vehicle_id, expense_date)` — for date-range filtering
- `expense_type` — single column
- `month_year` — single column

## Validations & business rules
- `amount` must be > 0 (serializer)
- `expense_date` cannot be in the future (serializer)
- `month_year` is auto-derived in serializer from `expense_date` (first day of that month) — coordinator never sets it manually
- `expense_type = fastag_recharge` rows feed `FastagRecord.fastag_recharged_amount` (aggregated at settlement time, not via signal)
- ALL expense rows for a vehicle+month are summed into `VehicleSettlement.total_expenses` at settlement calculation time
- Coordinator (and owner) can create/edit; no driver write access
- Only owner can delete (permission class)

## State / status
N/A — no status field. Expenses are immutable once created except by owner.

## API endpoints
| Method     | Path                              | Purpose                                    | Auth              |
|------------|-----------------------------------|--------------------------------------------|-------------------|
| GET        | /api/v1/expenses/                 | List (filter: vehicle, month_year, type)   | Owner             |
| POST       | /api/v1/expenses/                 | Log a new expense                          | Owner             |
| GET        | /api/v1/expenses/{id}/            | Detail                                     | Owner             |
| PUT/PATCH  | /api/v1/expenses/{id}/            | Update                                     | Owner             |
| DELETE     | /api/v1/expenses/{id}/            | Delete                                     | Owner only        |
| GET        | /api/v1/expenses/summary/         | Monthly totals per vehicle (for settlement screen) | Owner    |

## Lifecycle hooks / side effects
- None. Expenses are queried (aggregated) by VehicleSettlement at calculation time.
- No signals.

## Open questions / known limitations
- `paid_to_number` is a free-text string; no format validation (intentional — scanner IDs, UPI handles, and phone numbers all land here)
- Receipt image upload is optional; no OCR or validation on image content
- `month_year` derivation: if coordinator logs an expense on May 1 for work done April 30, they must manually correct the date to April 30 — month_year will follow automatically

## Removed from previous model
- `is_deducted`, `deducted_at` — removed; all expenses deduct at settlement
- `is_blinkit_reimbursable` — removed; Fastag handled by FastagRecord
- `trip` FK — removed; expenses belong to vehicle+month, not individual trips
- `company_management` type — moved to CompanyExpense model
- `driver` FK — removed; vehicle is the primary grouping
- `allowance`, `maintenance`, `toll` types — replaced by specific types above
