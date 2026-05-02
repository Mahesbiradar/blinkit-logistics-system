# FastagRecord

## Purpose
Standalone monthly Fastag ledger per vehicle. Tracks the prepaid tag balance
independently from the vehicle settlement. The owner tops up the tag during
the month (multiple recharges); at month-end the driver submits the Fastag
statement showing actual toll debits; the closing balance carries forward to
the next month automatically.

This model has NO connection to VehicleSettlement. Fastag money is tracked
separately from the vehicle payment calculation entirely.

## Source files
- Model:      backend/apps/expenses/models.py  (same app as Expense)
- Migration:  backend/apps/expenses/migrations/
- Views:      backend/apps/expenses/views.py
- Routes:     backend/apps/expenses/urls.py
- Serializer: backend/apps/expenses/serializers.py
- Tests:      none

## Fields

### Identity
| Field      | Type         | Nullable | Default | Constraints        | Notes                            |
|------------|--------------|----------|---------|--------------------|----------------------------------|
| id         | UUIDField    | No       | uuid4   | PK, editable=False |                                  |
| vehicle    | FK → Vehicle | No       | —       | CASCADE            |                                  |
| month_year | DateField    | No       | —       | —                  | First day of month (2026-04-01) |

### Balance fields
| Field                   | Type               | Nullable | Default | Notes                                                                      |
|-------------------------|--------------------|----------|---------|----------------------------------------------------------------------------|
| opening_balance         | DecimalField(10,2) | No       | 0       | Auto-pulled from previous month's closing_balance when record is created  |
| fastag_recharged_amount | DecimalField(10,2) | No       | 0       | Auto-computed: SUM of Expense(type=fastag_recharge, vehicle, month_year)  |
| fastag_debited_amount   | DecimalField(10,2) | No       | 0       | Coordinator enters from driver's Fastag statement                         |
| closing_balance         | DecimalField(10,2) | No       | 0       | Computed: opening_balance + recharged − debited                           |

### Statement tracking
| Field                  | Type          | Nullable | Default | Notes                                      |
|------------------------|---------------|----------|---------|--------------------------------------------|
| statement_submitted_at | DateTimeField | Yes      | —       | Set when coordinator enters debited amount |
| statement_image        | ImageField    | Yes      | —       | upload_to='fastag/statements/%Y/%m/'       |

### Status & audit
| Field      | Type               | Nullable | Default      | Constraints                                     | Notes                  |
|------------|--------------------|----------|--------------|-------------------------------------------------|------------------------|
| status     | CharField(20)      | No       | 'open'       | choices: open/submitted/closed                  |                        |
| created_by | FK → accounts.User | Yes      | —            | SET_NULL, related_name='fastag_records_created' |                        |
| updated_by | FK → accounts.User | Yes      | —            | SET_NULL, related_name='fastag_records_updated' | Set on each update     |
| created_at | DateTimeField      | No       | auto_now_add | —                                               |                        |
| updated_at | DateTimeField      | No       | auto_now     | —                                               |                        |

## Monthly Fastag flow

```
Opening Balance  (carried from last month's closing_balance)
+ Recharged      (auto-summed from Expense(type=fastag_recharge) rows)
− Debited        (from driver's Fastag statement)
= Closing Balance → becomes next month's Opening Balance
```

Example — KA63A5950, April 2026:
```
Opening Balance   =  1,000   (leftover from March)
+ Recharged       =  2,014   (4 top-ups logged as expenses during April)
− Debited         =  1,514   (actual tolls from driver's statement)
= Closing Balance =  1,500   → carries to May's opening_balance
```

If closing_balance is negative: tag went into deficit (NETC auto-debit).
Negative value carries forward — coordinator sees it as a red opening balance next month.

## Computed field logic in save()

```python
def save(self, *args, **kwargs):
    from apps.expenses.models import Expense
    from django.db.models import Sum
    self.fastag_recharged_amount = (
        Expense.objects
        .filter(vehicle=self.vehicle, month_year=self.month_year,
                expense_type='fastag_recharge')
        .aggregate(total=Sum('amount'))['total'] or 0
    )
    self.closing_balance = (
        self.opening_balance
        + self.fastag_recharged_amount
        - self.fastag_debited_amount
    )
    super().save(*args, **kwargs)
```

## mark_closed() method — triggers carry-forward

```python
def mark_closed(self, closed_by_user):
    self.status = 'closed'
    self.save()
    next_month = self._next_month()
    record, created = FastagRecord.objects.get_or_create(
        vehicle=self.vehicle,
        month_year=next_month,
        defaults={'status': 'open', 'opening_balance': self.closing_balance}
    )
    if not created:
        record.opening_balance = self.closing_balance
        record.save(update_fields=['opening_balance', 'updated_at'])

def _next_month(self):
    from datetime import date
    y, m = self.month_year.year, self.month_year.month
    return date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
```

## Relationships
| Relation   | Type       | Target        | FK            | On delete | Notes                                  |
|------------|------------|---------------|---------------|-----------|----------------------------------------|
| vehicle    | belongs_to | Vehicle       | vehicle_id    | CASCADE   |                                        |
| created_by | belongs_to | accounts.User | created_by_id | SET_NULL  | related_name='fastag_records_created'  |
| updated_by | belongs_to | accounts.User | updated_by_id | SET_NULL  | related_name='fastag_records_updated'  |

No FK to VehicleSettlement. These two models are completely independent.

## Indexes
- (vehicle_id, month_year) — unique_together
- month_year — single column
- status — single column

## Validations & business rules
- unique_together = ['vehicle', 'month_year']
- fastag_recharged_amount, closing_balance are read-only in serializer
- opening_balance is read-only except on the very first record for a vehicle (bootstrapping)
- fastag_debited_amount >= 0 (serializer)
- Setting fastag_debited_amount auto-sets status='submitted' and statement_submitted_at=now()
- Only mark_closed() sets status='closed'; only owner can call this
- Closed records are locked — no re-opening; corrections go to next month's opening_balance

## State / status
```
open       → submitted   (coordinator enters fastag_debited_amount)
submitted  → closed      (owner calls mark-closed; carry-forward triggers)
submitted  → open        (owner re-opens for correction)
closed     → [locked]
```

## API endpoints
| Method | Path                                           | Purpose                                               | Auth  |
|--------|------------------------------------------------|-------------------------------------------------------|-------|
| GET    | /api/v1/expenses/fastag/                       | List (filter: vehicle, month_year, status)            | Owner |
| POST   | /api/v1/expenses/fastag/                       | Create record for vehicle+month                       | Owner |
| GET    | /api/v1/expenses/fastag/{id}/                  | Detail — shows opening, recharged, debited, closing   | Owner |
| PATCH  | /api/v1/expenses/fastag/{id}/                  | Enter fastag_debited_amount (moves to submitted)      | Owner |
| POST   | /api/v1/expenses/fastag/{id}/refresh-recharge/ | Re-aggregate recharged_amount from Expense rows       | Owner |
| POST   | /api/v1/expenses/fastag/{id}/mark-closed/      | Close month; auto-creates next month's record         | Owner |
| POST   | /api/v1/expenses/fastag/{id}/reopen/           | submitted → open (correction before closing)          | Owner |

## What the UI should show (per vehicle per month)

```
KA63A5950 — Fastag — April 2026
─────────────────────────────────────
Opening Balance        ₹  1,000.00
+ Recharged (4 txns)   ₹  2,014.00
− Debited (statement)  ₹  1,514.00
─────────────────────────────────────
Closing Balance        ₹  1,500.00
Status: Closed  |  Carried to May ✓
```

## Lifecycle hooks / side effects
- save() always re-aggregates fastag_recharged_amount from Expense table
- mark_closed() creates/updates next month's FastagRecord with opening_balance = closing_balance
- No signals; no background jobs

## Open questions / known limitations
- First-ever record for a new vehicle needs manual opening_balance entry (bootstrapping)
- If a fastag_recharge Expense is added after FastagRecord is created, recharged_amount is stale until refresh-recharge is called
- No automated reminder when statement is not submitted by month-end
