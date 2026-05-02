# OTPCode

## Purpose
Stores time-limited one-time passwords sent to phone numbers for driver login and password reset flows. Each OTP is a standalone record linked by phone string (not FK to User) so it can be created before a User exists (during registration).

## Source files
- Model: backend/apps/accounts/models.py
- Migration/Schema: backend/apps/accounts/migrations/0001_initial.py
- Controller/Service: backend/apps/accounts/views.py
- Routes: backend/apps/accounts/urls.py
- Validators: backend/apps/accounts/serializers.py
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| phone | CharField(15) | No | — | db_index=True | Not FK; matches User.phone |
| otp_code | CharField(6) | No | — | — | 6-digit numeric string |
| purpose | CharField(20) | No | `'login'` | choices: login/password_reset | |
| expires_at | DateTimeField | No | — | — | Set to now+5min at creation |
| is_used | BooleanField | No | False | — | Flipped by `mark_used()` |
| attempt_count | IntegerField | No | 0 | — | Incremented on each verify attempt |
| created_at | DateTimeField | No | auto_now_add | — | |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| (none) | — | User (phone match) | string match | N/A | No DB-level FK; phone is looked up against users table in application code |

## Indexes
- `phone` — non-unique index via `db_index=True`
- `created_at` — ordering field; no explicit index declared

## Validations & business rules
- OTP is valid only when `is_used=False` AND `expires_at > now` (checked via `is_valid()`)
- OTP expires after 5 minutes (configured in settings)
- `attempt_count` is tracked but no hard lockout is enforced in code (no max-attempts check found)
- Old, unused OTPs for the same phone are NOT automatically invalidated — multiple valid OTPs can exist simultaneously for one phone
- OTP value (6 digits) is returned in the API response; SMS delivery is not implemented

## State / status (if applicable)
- `is_used`: False (created) → True (consumed by `mark_used()`). No reversal.
- Expiry is time-based, not a status field.

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| POST | /api/v1/auth/otp/send/ | Create OTPCode record, return code | None |
| POST | /api/v1/auth/otp/verify/ | Validate OTPCode, issue token | None |
| POST | /api/v1/auth/password/forgot/ | Create OTPCode for password_reset purpose | None |
| POST | /api/v1/auth/password/reset/ | Validate OTPCode, update password | None |

## Lifecycle hooks / side effects
- None; record is created in view, marked used in view. No signals or jobs.

## Open questions / known limitations
- No cleanup job: expired/used OTPCode rows accumulate indefinitely — a periodic purge task is not implemented
- No hard rate-limit on OTP send per phone (only global throttle: 5/min AnonymousRateThrottle)
- Multiple valid OTPs for the same phone at the same time is possible (e.g. if user sends twice within 5 min)
- `attempt_count` is incremented but never checked — brute-force protection is absent at the application level
