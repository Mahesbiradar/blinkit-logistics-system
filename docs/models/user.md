# User

## Purpose
Custom authentication user model replacing Django's default. Serves three roles (owner, coordinator, driver) with phone as the login identifier for drivers and email+password for admin roles. All other models trace back to this through direct FK or through Driver.

## Source files
- Model: backend/apps/accounts/models.py
- Migration/Schema: backend/apps/accounts/migrations/0001_initial.py
- Controller/Service: backend/apps/accounts/views.py
- Routes: backend/apps/accounts/urls.py
- Validators: backend/apps/accounts/serializers.py (field validation inline)
- Tests: none

## Fields
| Field | Type | Nullable | Default | Constraints | Notes |
|-------|------|----------|---------|-------------|-------|
| id | UUIDField | No | uuid4 | PK, editable=False | |
| email | EmailField | Yes | — | unique=True | Null allowed; only required for owner/coordinator |
| phone | CharField(15) | No | — | unique=True | USERNAME_FIELD; used for OTP login |
| first_name | CharField(100) | No | — | — | REQUIRED_FIELDS member |
| last_name | CharField(100) | No | `''` | blank=True | |
| role | CharField(20) | No | — | choices: owner/coordinator/driver | REQUIRED_FIELDS member |
| is_staff | BooleanField | No | False | — | Django admin access |
| is_active | BooleanField | No | True | — | Soft-disable toggle |
| is_superuser | BooleanField | No | False | — | Django superuser flag |
| last_login_at | DateTimeField | Yes | — | — | Updated manually via `update_last_login()` |
| created_at | DateTimeField | No | auto_now_add | — | |
| updated_at | DateTimeField | No | auto_now | — | |

## Relationships
| Relation | Type | Target | FK | On delete | Notes |
|----------|------|--------|-----|-----------|-------|
| driver_profile | OneToOne (reverse) | Driver | Driver.user | CASCADE | Exists only when role='driver' |
| created_trips | has_many (reverse) | Trip | Trip.created_by | SET_NULL | Trips created by this user |
| approved_trips | has_many (reverse) | Trip | Trip.approved_by | SET_NULL | Trips approved/rejected by this user |
| paid_payments | has_many (reverse) | Payment | Payment.paid_by | SET_NULL | Payments processed by this user |

## Indexes
- `phone` — unique index (from `unique=True`)
- `email` — unique index (from `unique=True`, sparse because nullable)
- `created_at` — ordering field; no explicit index declared

## Validations & business rules
- Phone must be unique across all users
- Email must be unique if provided (nullable unique — only one NULL is not enforced by all DBs; PostgreSQL allows multiple NULLs)
- Drivers log in via OTP only; email/password login is blocked for role='driver' at view level
- Password reset via OTP is only available to owner/coordinator (enforced in `ForgotPasswordRequestSerializer`)
- `CoordinatorCreateSerializer` enforces that coordinators are created by owner role only (permission class)
- `DriverRegistrationSerializer` requires a valid registration token (type='registration', 10 min TTL) to complete signup

## State / status (if applicable)
- `is_active`: True (default) → False (deactivated by admin). No formal transitions enforced; set directly.

## API endpoints
| Method | Path | Purpose | Auth required |
|--------|------|---------|---------------|
| POST | /api/v1/auth/otp/send/ | Send OTP to phone | None |
| POST | /api/v1/auth/otp/verify/ | Verify OTP; returns registration or access token | None |
| POST | /api/v1/auth/driver/register/ | Complete driver registration | Registration token |
| POST | /api/v1/auth/login/ | Email+password login (owner/coordinator) | None |
| POST | /api/v1/auth/password/forgot/ | Send password-reset OTP | None |
| POST | /api/v1/auth/password/reset/ | Reset password with OTP | None |
| POST | /api/v1/auth/token/refresh/ | Refresh access token | None |
| GET/PATCH | /api/v1/auth/profile/ | View/update own profile | Any role |
| POST | /api/v1/auth/profile/change-password/ | Change password | Owner/Coordinator |
| PATCH | /api/v1/auth/profile/driver/ | Update driver-specific profile fields | Driver |
| GET/POST | /api/v1/auth/coordinators/ | List/create coordinator accounts | Owner only |

## Lifecycle hooks / side effects
- `update_last_login()` is called at login (not Django's built-in `last_login`; custom field `last_login_at`)
- OTP creation triggers `OTPCode` record insert with 5-minute expiry; OTP value returned in API response (SMS not integrated)

## Open questions / known limitations
- `email` is nullable+unique: PostgreSQL allows multiple NULL emails (different users with no email), which is correct, but worth documenting explicitly
- `is_staff` is always False for non-superusers; Django admin access is separate from app role system
- No `updated_at` on `last_login_at` — the field is set manually, not via `auto_now`
- SMS delivery for OTP is not implemented: OTP code is returned directly in API response (security gap in production)
- Driver role cannot reset password via email (no email required for drivers); only OTP reset is available, but `ForgotPasswordRequestSerializer` blocks drivers from using it — password reset for drivers is effectively unsupported
