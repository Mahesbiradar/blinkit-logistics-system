# CompanyExpense

## Purpose
Tracks all JJR company-level overhead that has no vehicle attached: coordinator
salaries, room rent, team food, spare driver advances, Flipkart expenses, and
any other business operating costs. Completely separate from vehicle Expenses.
Feeds only the company P&L report.

## Source files
- Model:      backend/apps/expenses/models.py — `CompanyExpense` class
- Migration:  backend/apps/expenses/migrations/0003_restructure_expense_add_fastag_company.py
- Views:      backend/apps/expenses/views.py — `CompanyExpenseListCreateView`, `CompanyExpenseDetailView`, `CompanyExpenseSummaryView`
- Routes:     backend/apps/expenses/company_expense_urls.py (mounted at /api/v1/company-expenses/)
- Serializer: backend/apps/expenses/serializers.py — `CompanyExpenseSerializer`, `CompanyExpenseWriteSerializer`
- Tests:      none

## Fields
| Field           | Type               | Nullable | Default      | Constraints                          | Notes                                                   |
|-----------------|--------------------|----------|--------------|--------------------------------------|---------------------------------------------------------|
| id              | UUIDField          | No       | uuid4        | PK, editable=False                   |                                                         |
| expense_date    | DateField          | No       | —            | —                                    | Cannot be future (serializer)                           |
| expense_time    | TimeField          | Yes      | —            | —                                    | Optional; coordinators log this when available          |
| expense_type    | CharField(30)      | No       | —            | choices (7 values)                   | See table below                                         |
| amount          | DecimalField(10,2) | No       | —            | —                                    | Must be > 0 (serializer)                                |
| payment_mode    | CharField(20)      | No       | —            | choices (6 values)                   | phonepay/kiwi/amazon_pay/whatsapp/cash/other            |
| paid_to_name    | CharField(200)     | No       | ''           | blank=True                           | "Nagesh P", "Duragappa", "Raghu H"                      |
| paid_to_number  | CharField(50)      | No       | ''           | blank=True                           | Phone or account number                                 |
| month_year      | DateField          | No       | —            | —                                    | Auto-derived from expense_date (first of month)         |
| remarks         | TextField          | No       | ''           | blank=True                           |                                                         |
| receipt_image   | ImageField         | Yes      | —            | upload_to='company_expenses/%Y/%m/'  |                                                         |
| created_by      | FK → accounts.User | Yes      | —            | SET_NULL, related_name='company_expenses_created' | Auto-set to request.user               |
| created_at      | DateTimeField      | No       | auto_now_add | —                                    |                                                         |
| updated_at      | DateTimeField      | No       | auto_now     | —                                    |                                                         |

### expense_type choices
| Value                | Real-world meaning                                              |
|----------------------|-----------------------------------------------------------------|
| coordinator_salary   | Monthly salary for coordinator staff                           |
| room_rent            | Office / accommodation rent                                    |
| spare_driver         | Advance or payment to spare/standby driver (no vehicle FK)     |
| food                 | Team meals, snacks, dinners                                    |
| advance              | Ad-hoc advance to a company employee or contact               |
| flipkart             | Flipkart-related business expense                              |
| other                | Anything that doesn't fit above                               |

### payment_mode choices
`phonepay`, `kiwi`, `amazon_pay`, `whatsapp`, `cash`, `other`

## Relationships
| Relation   | Type       | Target        | FK            | On delete | Notes                                      |
|------------|------------|---------------|---------------|-----------|--------------------------------------------|
| created_by | belongs_to | accounts.User | created_by_id | SET_NULL  | related_name='company_expenses_created'    |

No FK to Vehicle, Driver, VehicleSettlement, or any other operational model.

## Indexes
- `(expense_type, month_year)` — composite; primary reporting query
- `month_year` — single column
- `expense_date` — single column

## Validations & business rules
- `amount` must be > 0 (serializer)
- `expense_date` cannot be in the future (serializer)
- `month_year` is auto-derived in serializer from `expense_date`
- Only owner can create/edit/delete (IsOwner permission class)
- No coordinator write access by default (owner controls this via permission settings)

## State / status
N/A — no status. Records are immutable after creation except by owner.

## API endpoints
| Method    | Path                           | Purpose                                         | Auth        |
|-----------|--------------------------------|-------------------------------------------------|-------------|
| GET       | /api/v1/company-expenses/      | List (filter: expense_type, month_year)         | Owner       |
| POST      | /api/v1/company-expenses/      | Create company expense                          | Owner       |
| GET       | /api/v1/company-expenses/{id}/ | Detail                                          | Owner       |
| PUT/PATCH | /api/v1/company-expenses/{id}/ | Update                                          | Owner       |
| DELETE    | /api/v1/company-expenses/{id}/ | Delete                                          | Owner only  |
| GET       | /api/v1/company-expenses/summary/ | Monthly totals by expense_type               | Owner       |

## Lifecycle hooks / side effects
- None. No signals, no downstream effects.

## Open questions / known limitations
- `coordinator_salary` type implies a coordinator FK would be useful (to know who was paid), but this is covered by `paid_to_name` + `paid_to_number` for now. If HR tracking is added later, a FK to User (coordinator) can be added.
- Spare driver entries (Duragappa-style) live here because no vehicle is assigned. Once a spare driver is assigned to a specific vehicle, that cost moves to Expense on that vehicle.
