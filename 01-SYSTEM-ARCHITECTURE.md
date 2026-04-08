# Blinkit Logistics Management System - Architecture Document

## Executive Summary

Production-ready Transportation Trip & Expense Management System for JJR Logistics handling Blinkit operations. Replaces manual Excel + WhatsApp workflows with a centralized digital platform.

---

## 1. System Overview

### 1.1 Current Pain Points (From Excel Analysis)
- Manual trip entry in Excel sheets per vehicle
- Scattered payment tracking across multiple tabs
- No real-time visibility for coordinators
- Image proof stored separately on WhatsApp
- Delayed approval workflows
- Manual salary calculations

### 1.2 Solution Goals
- 2-step trip entry for drivers (mobile-first)
- Real-time trip tracking with image proof
- Automated expense linking and calculations
- Role-based dashboards
- Vendor vs Owner vehicle differentiation

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   Driver App    │  │ Coordinator UI  │  │   Owner Portal  │             │
│  │  (Mobile PWA)   │  │   (Web Admin)   │  │   (Web Admin)   │             │
│  │  React + PWA    │  │  React + Tailwind│  │  React + Tailwind│            │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
└───────────┼────────────────────┼────────────────────┼──────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │ HTTPS/JSON
┌────────────────────────────────┼─────────────────────────────────────────────┐
│                           API GATEWAY                                        │
│                    (Django REST Framework)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Auth      │  │   Trips     │  │  Expenses   │  │    Dashboard        │ │
│  │   Module    │  │   Module    │  │   Module    │  │    Module           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────────┼─────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────────┐
│                         SERVICE LAYER                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  OTP Service│  │ Trip Service│  │ Payment     │  │  Notification       │ │
│  │  (Twilio)   │  │  (Business) │  │ Calculator  │  │  Service            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────────┼─────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────────────────┐
│                        DATA LAYER                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  PostgreSQL │  │ AWS S3 /    │  │   Redis     │  │   Celery            │ │
│  │  (Primary)  │  │ Firebase    │  │  (Cache)    │  │  (Background)       │ │
│  │             │  │  (Images)   │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Breakdown

### 3.1 Authentication Module
```
┌─────────────────────────────────────────┐
│         AUTHENTICATION FLOW             │
├─────────────────────────────────────────┤
│                                         │
│  Driver: Mobile + OTP                   │
│  ┌─────────┐    ┌─────────┐    ┌──────┐│
│  │  Enter  │───▶│  Send   │───▶│Verify││
│  │  Mobile │    │  OTP    │    │ OTP  ││
│  └─────────┘    └─────────┘    └──┬───┘│
│                                   │     │
│                              ┌────▼────┐│
│                              │  JWT    ││
│                              │  Token  ││
│                              └─────────┘│
│                                         │
│  Admin/Coordinator: Email/Password      │
│  ┌─────────┐    ┌─────────┐    ┌──────┐│
│  │  Email  │───▶│Password │───▶│ JWT  ││
│  │    +    │    │  Check  │    │Token ││
│  │Password │    └─────────┘    └──────┘│
│  └─────────┘                            │
└─────────────────────────────────────────┘
```

### 3.2 Trip Management Module
```
┌─────────────────────────────────────────┐
│           TRIP LIFECYCLE                │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐     ┌─────────┐           │
│  │  DRIVER │────▶│ PENDING │           │
│  │ CREATES │     │         │           │
│  │  TRIP   │     │         │           │
│  └─────────┘     └────┬────┘           │
│                       │                 │
│              ┌────────┴────────┐        │
│              ▼                 ▼        │
│        ┌─────────┐       ┌─────────┐    │
│        │APPROVED │       │REJECTED │    │
│        │         │       │         │    │
│        └────┬────┘       └─────────┘    │
│             │                           │
│             ▼                           │
│        ┌─────────┐                      │
│        │PROCESSED│                      │
│        │(Payment)│                      │
│        └─────────┘                      │
│                                         │
└─────────────────────────────────────────┘
```

### 3.3 Expense Management Module
```
┌─────────────────────────────────────────┐
│         EXPENSE TYPES MATRIX            │
├─────────────────────────────────────────┤
│                                         │
│  OWNER VEHICLES:                        │
│  ┌──────────┬──────────┬─────────────┐ │
│  │  Type    │  Tracked │ Deducted    │ │
│  ├──────────┼──────────┼─────────────┤ │
│  │  Fuel    │    ✓     │    No       │ │
│  │  Toll    │    ✓     │    No       │ │
│  │ Allowance│    ✓     │    No       │ │
│  │ Advance  │    ✓     │ From Salary │ │
│  └──────────┴──────────┴─────────────┘ │
│                                         │
│  VENDOR VEHICLES:                       │
│  ┌──────────┬──────────┬─────────────┐ │
│  │  Type    │  Tracked │ Deducted    │ │
│  ├──────────┼──────────┼─────────────┤ │
│  │  Fuel    │    ✓     │ From Payment│ │
│  │  Toll    │    ✓     │    No       │ │
│  │ Advance  │    ✓     │ From Payment│ │
│  │ Payment  │    ✓     │ KM × Rate   │ │
│  └──────────┴──────────┴─────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### 3.4 Payment Calculation Module
```
┌─────────────────────────────────────────┐
│      PAYMENT CALCULATION LOGIC          │
├─────────────────────────────────────────┤
│                                         │
│  OWNER VEHICLE DRIVER:                  │
│  ┌─────────────────────────────────┐    │
│  │  Final Salary =                 │    │
│  │  Base Salary - Total Advances   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  VENDOR PAYMENT:                        │
│  ┌─────────────────────────────────┐    │
│  │  Vendor Payment =               │    │
│  │  (Total KM × Rate per KM)       │    │
│  │  - Fuel Expenses                │    │
│  │  - Advance Given                │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. Data Flow Diagrams

### 4.1 Driver Trip Creation Flow
```
┌────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌────────┐
│ Driver │────▶│  Login  │────▶│ Upload  │────▶│ Upload  │────▶│ Enter  │
│  App   │     │  (OTP)  │     │Gate Pass│     │Map Image│     │ Store  │
└────────┘     └─────────┘     └────┬────┘     └────┬────┘     └───┬────┘
                                    │               │              │
                                    └───────────────┴──────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │  One-way KM │
                                            │   Entered   │
                                            └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │ Auto Calc:  │
                                            │ Total KM =  │
                                            │ One-way × 2 │
                                            └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │   SAVE      │
                                            │  Status:    │
                                            │  PENDING    │
                                            └─────────────┘
```

### 4.2 Coordinator Approval Flow
```
┌────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│Coordinator │────▶│ View All │────▶│ Filter/  │────▶│ Verify   │
│   Login    │     │  Trips   │     │  Search  │     │ Details  │
└────────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                          │
                                    ┌─────────────────────┼─────────────────────┐
                                    │                     │                     │
                                    ▼                     ▼                     ▼
                              ┌─────────┐          ┌─────────┐          ┌─────────┐
                              │ APPROVE │          │  REJECT │          │  EDIT   │
                              │         │          │         │          │         │
                              └────┬────┘          └────┬────┘          └────┬────┘
                                   │                    │                    │
                                   ▼                    ▼                    ▼
                              ┌─────────┐          ┌─────────┐          ┌─────────┐
                              │ Status: │          │ Status: │          │ Update  │
                              │APPROVED │          │REJECTED │          │ & Save  │
                              └─────────┘          └─────────┘          └─────────┘
```

---

## 5. Technology Stack

### 5.1 Backend Stack
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Django 5.x | Web framework |
| API | Django REST Framework | REST API |
| Database | PostgreSQL 15+ | Primary data store |
| Cache | Redis 7+ | Session & caching |
| Task Queue | Celery + Redis | Background jobs |
| Storage | AWS S3 / Firebase | Image storage |
| OTP | Twilio / Fast2SMS | SMS service |
| Auth | JWT (djangorestframework-simplejwt) | Token auth |

### 5.2 Frontend Stack
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18+ | UI library |
| Styling | Tailwind CSS 3+ | Utility CSS |
| State | React Query + Zustand | Data & app state |
| Routing | React Router v6 | Navigation |
| HTTP | Axios | API calls |
| PWA | Workbox | Offline support |
| Charts | Recharts | Dashboard visualizations |
| Icons | Lucide React | Icon library |

### 5.3 DevOps Stack
| Component | Technology | Purpose |
|-----------|------------|---------|
| Container | Docker + Docker Compose | Local dev |
| Server | Gunicorn + Nginx | Production |
| CI/CD | GitHub Actions | Automation |
| Monitoring | Sentry | Error tracking |

---

## 6. Security Architecture

```
┌─────────────────────────────────────────┐
│           SECURITY LAYERS               │
├─────────────────────────────────────────┤
│                                         │
│  Layer 1: Transport                     │
│  └── HTTPS/TLS 1.3 for all traffic      │
│                                         │
│  Layer 2: Authentication                │
│  └── JWT tokens with refresh            │
│  └── OTP expiry: 5 minutes              │
│  └── Token expiry: 24 hours             │
│                                         │
│  Layer 3: Authorization                 │
│  └── Role-based access control (RBAC)   │
│  └── Object-level permissions           │
│                                         │
│  Layer 4: Input Validation              │
│  └── Serializer validation              │
│  └── File type/size restrictions        │
│                                         │
│  Layer 5: Data Protection               │
│  └── PostgreSQL SSL connection          │
│  └── Encrypted S3 buckets               │
│  └── Phone number masking in logs       │
│                                         │
└─────────────────────────────────────────┘
```

---

## 7. Scalability Considerations

### 7.1 Horizontal Scaling
- Stateless API servers (Gunicorn workers)
- PostgreSQL read replicas for reporting
- Redis Cluster for session distribution
- CDN for static assets and images

### 7.2 Performance Optimizations
- Database indexing on frequent queries
- Query optimization with select_related/prefetch_related
- Image compression before upload
- Pagination for all list endpoints
- Redis caching for dashboard data

### 7.3 Database Partitioning Strategy
- Trips table: Partition by month
- Expenses table: Partition by month
- Archive old data (6+ months) to cold storage

---

## 8. Folder Structure

```
blinkit-logistics-system/
├── backend/
│   ├── config/                 # Django settings
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── accounts/           # User management
│   │   ├── drivers/            # Driver profiles
│   │   ├── vehicles/           # Vehicle management
│   │   ├── trips/              # Trip operations
│   │   ├── expenses/           # Expense tracking
│   │   ├── payments/           # Payment calculations
│   │   └── dashboard/          # Analytics APIs
│   ├── utils/                  # Shared utilities
│   ├── templates/              # Email templates
│   └── requirements/
│       ├── base.txt
│       └── production.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── common/
│   │   │   ├── driver/
│   │   │   └── admin/
│   │   ├── pages/              # Page components
│   │   │   ├── driver/
│   │   │   └── admin/
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API services
│   │   ├── store/              # State management
│   │   ├── utils/              # Utilities
│   │   └── styles/             # Global styles
│   └── package.json
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
└── docs/
    ├── api/
    ├── deployment/
    └── user-guides/
```

---

## 9. API Architecture

### 9.1 RESTful Design Principles
- Resource-based URLs: `/api/v1/trips/`, `/api/v1/drivers/`
- HTTP methods: GET, POST, PUT, PATCH, DELETE
- Status codes: 200, 201, 400, 401, 403, 404, 500
- Consistent response format

### 9.2 Response Format
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

### 9.3 Error Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "field_name": ["Error message"]
  }
}
```

---

## 10. Mobile-First Design Principles

### 10.1 Driver App Guidelines
- Touch targets: Minimum 48x48px
- Font sizes: Minimum 16px for inputs
- Contrast ratio: 4.5:1 minimum
- One-handed operation friendly
- Offline form submission with sync

### 10.2 Progressive Web App Features
- Installable on home screen
- Push notifications for approvals
- Background sync for trips
- Cached assets for offline use

---

## 11. Monitoring & Logging

### 11.1 Application Metrics
- API response times
- Error rates by endpoint
- Active users (daily/weekly)
- Trip creation rate

### 11.2 Business Metrics
- Trips per day
- Average KM per trip
- Expense breakdown
- Payment processing time

### 11.3 Alerting
- High error rate (>5%)
- Database connection failures
- SMS service downtime
- Storage quota exceeded

---

## 12. Disaster Recovery

### 12.1 Backup Strategy
- PostgreSQL: Daily automated backups
- S3: Versioning enabled
- Retention: 30 days

### 12.2 Recovery Objectives
- RPO (Recovery Point Objective): 24 hours
- RTO (Recovery Time Objective): 4 hours

---

*Document Version: 1.0*
*Last Updated: April 2026*
*Author: System Architect*
