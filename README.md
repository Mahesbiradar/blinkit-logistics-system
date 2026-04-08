# Blinkit Logistics Management System

A comprehensive **Transportation Trip & Expense Management System** for JJR Logistics handling Blinkit operations. This system replaces manual Excel + WhatsApp-based operations with a centralized digital platform.

---

## Features

### For Drivers (Mobile-First)
- **2-Step Trip Entry**: Upload gate pass image + Google Maps screenshot
- **Simple UI**: Large buttons, minimal typing
- **Trip Tracking**: View trip history and status
- **Expense Tracking**: Track advances and expenses
- **Salary Preview**: View expected salary

### For Coordinators/Owners
- **Trip Management**: Approve/reject trips with image verification
- **Driver Management**: Add/edit drivers and assign vehicles
- **Vehicle Management**: Track owner and vendor vehicles
- **Expense Tracking**: Monitor all expenses by type
- **Payment Processing**: Calculate and process salaries/vendor payments
- **Dashboard**: Real-time analytics and reports

---

## Tech Stack

### Backend
- **Framework**: Django 5.x + Django REST Framework
- **Database**: PostgreSQL 15+
- **Authentication**: JWT (PyJWT)
- **Cache**: Redis 7+
- **Storage**: AWS S3 (production)
- **Task Queue**: Celery + Redis

### Frontend
- **Framework**: React 18+
- **Styling**: Tailwind CSS 3+
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Charts**: Recharts
- **PWA**: Vite PWA Plugin

### DevOps
- **Containerization**: Docker + Docker Compose
- **Server**: Gunicorn + Nginx
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry

---

## Project Structure

```
blinkit-logistics-system/
├── backend/                    # Django Backend
│   ├── apps/
│   │   ├── accounts/          # User authentication
│   │   ├── drivers/           # Driver management
│   │   ├── vehicles/          # Vehicle & vendor management
│   │   ├── trips/             # Trip management
│   │   ├── expenses/          # Expense tracking
│   │   ├── payments/          # Payment processing
│   │   └── dashboard/         # Analytics APIs
│   ├── config/                # Django settings
│   └── requirements/          # Python dependencies
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API services
│   │   ├── store/             # Zustand stores
│   │   └── styles/            # Global styles
│   └── public/                # Static assets
│
├── docker/                     # Docker configurations
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
│
└── docs/                       # Documentation
    ├── 01-SYSTEM-ARCHITECTURE.md
    ├── 02-DATABASE-SCHEMA.md
    ├── 03-API-DESIGN.md
    ├── 04-FRONTEND-ARCHITECTURE.md
    └── 05-BUILD-PLAN.md
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/base.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development server
npm run dev
```

### Docker Setup (Recommended)

```bash
# Navigate to docker directory
cd docker

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## API Documentation

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/otp/send/` | POST | Send OTP to phone |
| `/api/v1/auth/otp/verify/` | POST | Verify OTP and login |
| `/api/v1/auth/driver/register/` | POST | Complete driver registration |
| `/api/v1/auth/login/` | POST | Admin/Coordinator login |
| `/api/v1/auth/token/refresh/` | POST | Refresh access token |

### Trip Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/trips/` | GET/POST | List/Create trips |
| `/api/v1/trips/<id>/` | GET/PATCH | Get/Update trip |
| `/api/v1/trips/<id>/approve/` | POST | Approve trip |
| `/api/v1/trips/<id>/reject/` | POST | Reject trip |
| `/api/v1/trips/my-trips/` | GET | Get driver's trips |
| `/api/v1/trips/pending/` | GET | Get pending trips |

See [API Design Document](03-API-DESIGN.md) for complete documentation.

---

## Database Schema

### Core Tables
- **users**: User accounts (Owner, Coordinator, Driver)
- **drivers**: Driver profiles
- **vehicles**: Vehicle information
- **vendors**: Vendor information for vendor vehicles
- **driver_vehicle_mappings**: Many-to-many driver-vehicle assignments
- **trips**: Trip records with images
- **expenses**: Expense records
- **payments**: Payment/salary records

See [Database Schema Document](02-DATABASE-SCHEMA.md) for complete schema.

---

## Payment Calculations

### Owner Vehicle Driver Salary
```
Final Salary = Base Salary - Total Advances
```

### Vendor Payment
```
Vendor Payment = (Total KM × Rate per KM) - Fuel Expenses - Advance
```

---

## User Roles & Permissions

### Owner (Admin)
- Full system access
- Manage users, drivers, vehicles
- Approve/reject trips
- Process payments
- View all reports

### Coordinator
- Manage trips
- Approve/reject trips
- View reports
- Cannot manage users or process payments

### Driver
- Create trips
- View own trips
- View expenses
- View salary information

---

## Mobile-First Design

The driver interface is designed for mobile-first usage:
- Touch-friendly buttons (min 48x48px)
- Large font sizes (min 16px)
- Camera integration for image capture
- Simple 2-step trip entry
- Offline support (PWA)

---

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- OTP verification for drivers
- Rate limiting
- Input validation
- XSS/CSRF protection
- Secure file uploads

---

## Performance Optimizations

- Database indexing
- Query optimization with select_related/prefetch_related
- Redis caching
- Image compression
- Code splitting
- Lazy loading
- PWA caching

---

## Deployment

### Production Checklist

1. **Environment Setup**
   - Set `DEBUG=False`
   - Configure production database
   - Set up AWS S3 for media storage
   - Configure Redis

2. **Security**
   - Change secret key
   - Enable SSL/HTTPS
   - Configure security headers
   - Set up rate limiting

3. **Performance**
   - Enable Gzip compression
   - Configure CDN
   - Set up caching
   - Optimize database

4. **Monitoring**
   - Set up Sentry for error tracking
   - Configure logging
   - Set up uptime monitoring

See [Build Plan Document](05-BUILD-PLAN.md) for detailed deployment instructions.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

---

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## Support

For support, contact:
- Email: support@jjrlogistics.com
- Phone: +91 XXXXXXXXXX

---

## Acknowledgments

- Blinkit for the opportunity
- All drivers and coordinators using the system
- Development team

---

*Built with ❤️ by JJR Logistics Tech Team*
