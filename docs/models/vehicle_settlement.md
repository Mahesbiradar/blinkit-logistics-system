# VehicleSettlement

## Purpose
Monthly closing document for each vehicle. Answers: "What does JJR owe this
vehicle for this month, after subtracting everything already paid out?"
Coordinator fills gross inputs manually; system aggregates expenses and
computes the balance. Fastag is tracked completely separately in FastagRecord
and does NOT appear here.

## Source files
- Model:      backend/apps/payments/models.py — `VehicleSettlement` class
- Migration:  backend/apps/payments/migrations/0002_replace_payment_with_vehicle_settlement.py
- Views:      backend/apps/payments/views.py — `VehicleSettlementListCreateView`, `VehicleSettlementDetailView`, `SettlementCalculateView`, `SettlementFinalizeView`, `SettlementMarkPaidView`, `SettlementReopenView`, `VehicleSettlementSummaryView`
- Routes:     backend/apps/payments/urls.py (mounted at /api/v1/settlements/)
- Serializer: backend/apps/payments/serializers.py — `VehicleSettlementSerializer`, `VehicleSettlementCreateSerializer`, `VehicleSettlementPatchSerializer`, `MarkPaidSerializer`
- Tests:      none

## Fields

### Identity
| Field      | Type         | Nullable | Default | Constraints        | Notes                            |
|------------|--------------|----------|---------|--------------------|----------------------------------|
| id         | UUIDField    | No       | uuid4   | PK, editable=False |                                  |
| vehicle    | FK → Vehicle | No       | —       | CASCADE            |                                  |
| month_year | DateField    | No       | —       | —                  | First day of month (2026-04-01) |

### Trip summary (manual input)
| Field        | Type               | Nullable | Default | Notes                          |
|--------------|--------------------|----------|---------|--------------------------------|
| total_days   | IntegerField       | No       | 0       | Calendar days in the month    |
| working_days | IntegerField       | No       | 0       | Days vehicle actually operated |
| total_km     | DecimalField(10,2) | No       | 0       | From trips or manual entry    |

### Gross calculation inputs (all manual)
| Field                 | Type               | Nullable | Default | Notes                                          |
|-----------------------|--------------------|----------|---------|------------------------------------------------|
| base_amount           | DecimalField(10,2) | No       | 0       | Agreed rate for this vehicle this month       |
| absent_penalty_days   | IntegerField       | No       | 0       | Number of penalised days                      |
| absent_penalty_amount | DecimalField(10,2) | No       | 0       | Coordinator calculates and enters             |
| extra_km_amount       | DecimalField(10,2) | No       | 0       | Excess-KM charge; coordinator enters          |

### Computed totals (system fills via calculate())
| Field                       | Type               | Notes                                                             |
|-----------------------------|--------------------|-------------------------------------------------------------------|
| total_expenses              | DecimalField(10,2) | SUM of all Expense(vehicle, month_year) — including fastag_recharge rows |
| gross_amount                | DecimalField(10,2) | base_amount − absent_penalty_amount + extra_km_amount            |
| carry_forward_from_previous | DecimalField(10,2) | Auto-pulled from previous month's unpaid balance at creation     |
| balance_payable             | DecimalField(10,2) | gross_amount − total_expenses + carry_forward_from_previous       |

### Payment fields (filled when marking paid)
| Field                 | Type               | Nullable | Default | Notes                                      |
|-----------------------|--------------------|----------|---------|--------------------------------------------|
| status                | CharField(20)      | No       | 'draft' | choices: draft / finalized / paid          |
| paid_amount           | DecimalField(10,2) | No       | 0       | Actual amount transferred                  |
| paid_at               | DateTimeField      | Yes      | —       | Set by mark_paid()                         |
| paid_by               | FK → accounts.User | Yes      | —       | SET_NULL, related_name='settlements_paid'  |
| payment_mode          | CharField(20)      | No       | ''      | blank=True                                 |
| transaction_reference | CharField(100)     | No       | ''      | blank=True; UPI / bank reference           |
| remarks               | TextField          | No       | ''      | blank=True                                 |

### Audit
| Field      | Type               | Nullable | Default      | Notes                                       |
|------------|--------------------|----------|--------------|---------------------------------------------|
| created_by | FK → accounts.User | Yes      | —            | SET_NULL, related_name='settlements_created'|
| created_at | DateTimeField      | No       | auto_now_add |                                             |
| updated_at | DateTimeField      | No       | auto_now     |                                             |

## Balance Formula

```
gross_amount    = base_amount − absent_penalty_amount + extra_km_amount

total_expenses  = SUM of ALL Expense rows for this vehicle + month_year
                  (this includes fastag_recharge type — it is real money JJR paid out)

balance_payable = gross_amount
                − total_expenses
                + carry_forward_from_previous
```

Note: Fastag recharge expenses are included in total_expenses because they are
real cash JJR spent. The Fastag account reconciliation (opening/closing balance,
statement vs recharge) is tracked separately in FastagRecord and never touches
this settlement.

Example — KA63A5950, April 2026:
```
gross          = 88,000 − 0 + 0       = 88,000
total_expenses = 114,212               (includes 2,014 fastag recharge)
carry_forward  = +55,462               (advance given in March)

balance_payable = 88,000 − 114,212 + 55,462 = 29,250
```

## calculate() method

```python
def calculate(self):
    from apps.expenses.models import Expense
    from django.db.models import Sum

    self.total_expenses = (
        Expense.objects
        .filter(vehicle=self.vehicle, month_year=self.month_year)
        .aggregate(total=Sum('amount'))['total'] or 0
    )
    self.gross_amount = (
        self.base_amount
        - self.absent_penalty_amount
        + self.extra_km_amount
    )
    self.balance_payable = (
        self.gross_amount
        - self.total_expenses
        + self.carry_forward_from_previous
    )
    self.save()
```

## mark_paid() method — triggers carry-forward

```python
def mark_paid(self, paid_by_user, paid_amount, payment_mode='', transaction_reference=''):
    self.status = 'paid'
    self.paid_amount = paid_amount
    self.paid_at = timezone.now()
    self.paid_by = paid_by_user
    self.payment_mode = payment_mode
    self.transaction_reference = transaction_reference
    self.save()

    unpaid = self.balance_payable - paid_amount
    if unpaid != 0:
        next_month = self._next_month()
        settlement, created = VehicleSettlement.objects.get_or_create(
            vehicle=self.vehicle,
            month_year=next_month,
            defaults={'status': 'draft', 'carry_forward_from_previous': unpaid}
        )
        if not created:
            settlement.carry_forward_from_previous = unpaid
            settlement.save(update_fields=['carry_forward_from_previous', 'updated_at'])

def _next_month(self):
    from datetime import date
    y, m = self.month_year.year, self.month_year.month
    return date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
```

## Relationships
| Relation   | Type       | Target        | FK            | On delete | Notes                                 |
|------------|------------|---------------|---------------|-----------|---------------------------------------|
| vehicle    | belongs_to | Vehicle       | vehicle_id    | CASCADE   |                                       |
| paid_by    | belongs_to | accounts.User | paid_by_id    | SET_NULL  | related_name='settlements_paid'       |
| created_by | belongs_to | accounts.User | created_by_id | SET_NULL  | related_name='settlements_created'    |

No FK to FastagRecord. The two models are completely independent.

## Indexes
- (vehicle_id, month_year) — unique_together
- status — single column
- month_year — single column

## Validations & business rules
- unique_together = ['vehicle', 'month_year']
- base_amount > 0 required when transitioning draft → finalized (not for draft creation)
- working_days <= total_days (serializer)
- All computed fields (gross_amount, total_expenses, carry_forward, balance_payable) are read-only in serializer
- carry_forward_from_previous is never manually editable by coordinator or owner
- Status transitions enforced in action views, not in model save()
- Only owner can finalize, mark-paid, or reopen

## State / status
```
draft      → finalized   (owner reviews; base_amount must be > 0)
finalized  → paid        (owner marks paid; carry-forward auto-creates for next month)
finalized  → draft       (owner re-opens for correction)
paid       → [locked]    (no re-opening once paid)
```

## API endpoints
| Method    | Path                                  | Purpose                                       | Auth  |
|-----------|---------------------------------------|-----------------------------------------------|-------|
| GET       | /api/v1/settlements/                  | List (filter: vehicle, month_year, status)    | Owner |
| POST      | /api/v1/settlements/                  | Create draft settlement                       | Owner |
| GET       | /api/v1/settlements/{id}/             | Detail with all computed fields               | Owner |
| PATCH     | /api/v1/settlements/{id}/             | Update manual fields (draft only)             | Owner |
| POST      | /api/v1/settlements/{id}/calculate/   | Re-aggregate expenses; update computed fields | Owner |
| POST      | /api/v1/settlements/{id}/finalize/    | draft → finalized                             | Owner |
| POST      | /api/v1/settlements/{id}/mark-paid/   | finalized → paid; triggers carry-forward      | Owner |
| POST      | /api/v1/settlements/{id}/reopen/      | finalized → draft                             | Owner |
| GET       | /api/v1/settlements/summary/          | All vehicles for a given month_year           | Owner |

## Lifecycle hooks / side effects
- calculate() reads only from Expense table — no FastagRecord dependency
- mark_paid() auto-creates/updates next month's carry_forward_from_previous
- No signals; all computation is synchronous

## Migration note
Old Payment model rows map to VehicleSettlement as follows:
- Payment(type=salary or vendor_payment) → VehicleSettlement rows
- Payment(type=advance or reimbursement) → dead code, discard
- Old base_salary / km_amount → maps to base_amount
- Old total_deductions → maps to total_expenses (recalculate from Expense rows)
