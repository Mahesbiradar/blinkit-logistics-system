# Project: Blinkit Logistics System (JJR Logistics)

## What this app does
A vendor management information system (MIS) for a Blinkit delivery vendor managing 20+ vehicles. It replaces a manual Excel + WhatsApp workflow where coordinators typed trip data from driver photos. The system tracks daily trips, KM, expenses, driver salaries, and vendor settlements across three user roles: owner, coordinator, and driver.

## Tech stack
- Language/Runtime: Python 3.x / Node.js 18+
- Framework: Django 5.0 (REST Framework 3.14) / React 18 + Vite
- Database: PostgreSQL 15
- ORM/Query builder: Django ORM
- Validation lib: DRF serializers (field + object-level validation)
- Auth: JWT (custom JWTAuthentication); phone+OTP for drivers, email+password for owner/coordinator
- Other notable libs: openpyxl + reportlab (Excel/PDF reports), Pillow (image uploads), django-filter, Recharts (frontend charts), Zustand (state), React Query (data fetching), Tailwind CSS

## Folder structure
```
blinkit-logistics-system/
├── backend/                  Django project root
│   ├── apps/
│   │   ├── accounts/         User model, OTP auth, JWT tokens
│   │   ├── drivers/          Driver profiles + vehicle assignments
│   │   ├── vehicles/         Vehicle + Vendor models
│   │   ├── trips/            Trip + Store models, approval workflow
│   │   ├── expenses/         Expense tracking (fuel, toll, advance, etc.)
│   │   ├── payments/         Salary + vendor payment calculations
│   │   ├── dashboard/        Aggregate stats for admin dashboard
│   │   ├── reports/          Excel/PDF report generation
│   │   └── common/           Shared permissions, pagination, renderers
│   ├── config/
│   │   ├── settings/         base.py, development.py, production.py
│   │   └── urls.py           Root URL config
│   └── requirements/         base.txt, development.txt, production.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/        AdminDashboard, DriversManagement, TripsManagement, etc.
│   │   │   ├── driver/       DriverDashboard, AddTrip, MyTrips, MyExpenses
│   │   │   └── auth/         Login, OTPVerify, DriverRegister, ForgotPassword
│   │   ├── services/         axios wrappers per domain (tripService, etc.)
│   │   ├── hooks/            React Query hooks per domain
│   │   └── store/            Zustand auth store
│   └── public/               PWA manifest, icons
└── docker/                   Dockerfile.backend, Dockerfile.frontend, docker-compose.yml
```

## Conventions
- Naming: snake_case files/columns; PascalCase model classes; kebab-case React filenames; DB tables explicitly set via `Meta.db_table` (e.g. `'trips'`, `'drivers'`)
- Error handling pattern: DRF raises `ValidationError` from serializer `validate_*` methods; views return standard DRF error responses; custom `StandardJSONRenderer` wraps all responses
- Validation pattern: Input validated in DRF serializer (`validate_<field>` and `validate()`); no separate validators.py files; business rules enforced in serializer, not model `.save()`
- Response shape: `{"status": "success"|"error", "data": {...}|null, "message": "..."}` via `StandardJSONRenderer`
- Migration approach: Standard Django migrations; explicit `db_table` on every model; seed data in dedicated migration (trips/0003 seeds 55 stores)
- Testing approach: Not implemented

## Models implemented
| Model | File | Purpose | Key relationships |
|-------|------|---------|-------------------|
| User | backend/apps/accounts/models.py | Auth user; drives role-based access | OneToOne → Driver |
| OTPCode | backend/apps/accounts/models.py | Phone-based OTP for driver login | standalone (phone string match) |
| Driver | backend/apps/drivers/models.py | Driver profile extending User | OneToOne ← User; M2M → Vehicle via DriverVehicleMapping |
| DriverVehicleMapping | backend/apps/drivers/models.py | M2M join with assignment history | FK → Driver, FK → Vehicle |
| Vendor | backend/apps/vehicles/models.py | Third-party vehicle owner | has_many → Vehicle |
| Vehicle | backend/apps/vehicles/models.py | Vehicle master; owner or vendor type | FK → Vendor; M2M → Driver via DriverVehicleMapping |
| Store | backend/apps/trips/models.py | Blinkit store/destination master | name string copied into Trip (no FK) |
| Trip | backend/apps/trips/models.py | One day's dispatch record (up to 2 sub-trips) | FK → Driver, FK → Vehicle, FK → User (created_by, approved_by) |
| Expense | backend/apps/expenses/models.py | Vehicle payment ledger (diesel, advance, repair, etc.) — 12 types | FK → Vehicle, FK → User (created_by) |
| FastagRecord | backend/apps/expenses/models.py | Monthly Fastag balance per vehicle (independent of settlement) | FK → Vehicle; save() aggregates from Expense(fastag_recharge) |
| CompanyExpense | backend/apps/expenses/models.py | JJR overhead with no vehicle (coordinator salary, rent, etc.) — 7 types | FK → User (created_by) only |
| VehicleSettlement | backend/apps/payments/models.py | Monthly closing document per vehicle; calculate() sums expenses | FK → Vehicle, FK → User (paid_by, created_by) |

## Models planned (not yet implemented)
- None currently planned in code

## How to run
```bash
# Start all services (PostgreSQL, Redis, backend, frontend)
cd docker
docker compose up --build

# Run migrations (inside container or with venv active)
python manage.py migrate

# Create default admin users
python manage.py bootstrap_admin

# Backend only (dev, no Docker)
cd backend
pip install -r requirements/development.txt
python manage.py runserver

# Frontend only (dev)
cd frontend
npm install
npm run dev
```

**Ports:** Backend → 8000, Frontend → 5173, PostgreSQL → 5433, Redis → 6380
