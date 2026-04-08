# Blinkit Logistics System - API Design

## Base URL
```
Development: http://localhost:8000/api/v1
Production: https://api.jjrlogistics.com/api/v1
```

## Authentication
All endpoints (except login/OTP) require JWT token in header:
```
Authorization: Bearer <access_token>
```

---

## 1. AUTHENTICATION APIs

### 1.1 Send OTP (Driver Login)
```http
POST /auth/otp/send/
```

**Request:**
```json
{
  "phone": "7090842845"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "7090842845",
    "expires_in": 300
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Invalid phone number",
  "errors": {
    "phone": ["Phone number must be 10 digits"]
  }
}
```

---

### 1.2 Verify OTP (Driver Login)
```http
POST /auth/otp/verify/
```

**Request:**
```json
{
  "phone": "7090842845",
  "otp": "123456"
}
```

**Response (200) - Existing User:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "7090842845",
      "first_name": "Udaykumar",
      "role": "driver"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIs...",
      "refresh": "eyJhbGciOiJIUzI1NiIs..."
    },
    "driver_profile": {
      "id": "uuid",
      "license_number": "KA01X1234",
      "primary_vehicle": {
        "id": "uuid",
        "vehicle_number": "KA63A5950"
      }
    }
  }
}
```

**Response (200) - New User:**
```json
{
  "success": true,
  "message": "OTP verified. Please complete registration.",
  "data": {
    "phone": "7090842845",
    "is_new_user": true,
    "temp_token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 1.3 Complete Driver Registration
```http
POST /auth/driver/register/
```

**Headers:**
```
Authorization: Bearer <temp_token>
```

**Request:**
```json
{
  "first_name": "Udaykumar",
  "last_name": "S",
  "license_number": "KA01X1234",
  "vehicle_id": "uuid-of-vehicle"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "7090842845",
      "first_name": "Udaykumar",
      "role": "driver"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIs...",
      "refresh": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

---

### 1.4 Admin/Coordinator Login
```http
POST /auth/login/
```

**Request:**
```json
{
  "email": "admin@jjrlogistics.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@jjrlogistics.com",
      "first_name": "Admin",
      "role": "owner",
      "permissions": ["full_access"]
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIs...",
      "refresh": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

---

### 1.5 Refresh Token
```http
POST /auth/token/refresh/
```

**Request:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 2. TRIP APIs

### 2.1 Create Trip (Driver)
```http
POST /trips/
Content-Type: multipart/form-data
```

**Request:**
```
trip_date: 2026-04-08
dispatch_time_1: 05:30:00
store_name_1: Tubrahalli ES-131
one_way_km_1: 52
dispatch_time_2: 13:30:00
store_name_2: Sobha Oasis ES-120
one_way_km_2: 28
gate_pass_image: <file>
map_screenshot: <file>
remarks: (optional)
```

**Response (201):**
```json
{
  "success": true,
  "message": "Trip created successfully",
  "data": {
    "id": "uuid",
    "trip_date": "2026-04-08",
    "driver": {
      "id": "uuid",
      "name": "Udaykumar"
    },
    "vehicle": {
      "id": "uuid",
      "vehicle_number": "KA63A5950"
    },
    "trip_1": {
      "dispatch_time": "05:30:00",
      "store_name": "Tubrahalli ES-131",
      "one_way_km": 52
    },
    "trip_2": {
      "dispatch_time": "13:30:00",
      "store_name": "Sobha Oasis ES-120",
      "one_way_km": 28
    },
    "total_km": 160,
    "gate_pass_image_url": "https://s3.amazonaws.com/...",
    "map_screenshot_url": "https://s3.amazonaws.com/...",
    "status": "pending",
    "created_at": "2026-04-08T10:30:00Z"
  }
}
```

**Validation Rules:**
- `trip_date` cannot be in the future
- `one_way_km_1` or `one_way_km_2` must be provided (at least one trip)
- Images: Max 5MB, formats: jpg, jpeg, png
- Driver can only create trips for their assigned vehicle

---

### 2.2 Get My Trips (Driver)
```http
GET /trips/my-trips/?start_date=2026-04-01&end_date=2026-04-30&status=pending
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": "uuid",
        "trip_date": "2026-04-08",
        "vehicle_number": "KA63A5950",
        "store_name_1": "Tubrahalli ES-131",
        "store_name_2": "Sobha Oasis ES-120",
        "total_km": 160,
        "status": "pending",
        "gate_pass_image_url": "https://s3.amazonaws.com/...",
        "created_at": "2026-04-08T10:30:00Z"
      }
    ],
    "summary": {
      "total_trips": 25,
      "total_km": 2150,
      "pending_trips": 3,
      "approved_trips": 22
    }
  },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 25
  }
}
```

---

### 2.3 List All Trips (Admin/Coordinator)
```http
GET /trips/?driver_id=&vehicle_id=&status=pending&start_date=&end_date=&page=1
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| driver_id | UUID | Filter by driver |
| vehicle_id | UUID | Filter by vehicle |
| status | string | pending, approved, rejected |
| start_date | date | From date (YYYY-MM-DD) |
| end_date | date | To date (YYYY-MM-DD) |
| page | int | Page number |
| per_page | int | Items per page (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": "uuid",
        "trip_date": "2026-04-08",
        "driver": {
          "id": "uuid",
          "name": "Udaykumar",
          "phone": "7090842845"
        },
        "vehicle": {
          "id": "uuid",
          "vehicle_number": "KA63A5950"
        },
        "trip_1": {
          "dispatch_time": "05:30:00",
          "store_name": "Tubrahalli ES-131",
          "one_way_km": 52
        },
        "trip_2": {
          "dispatch_time": "13:30:00",
          "store_name": "Sobha Oasis ES-120",
          "one_way_km": 28
        },
        "total_km": 160,
        "status": "pending",
        "gate_pass_image_url": "https://s3.amazonaws.com/...",
        "map_screenshot_url": "https://s3.amazonaws.com/...",
        "created_at": "2026-04-08T10:30:00Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

### 2.4 Get Trip Detail
```http
GET /trips/{trip_id}/
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trip_date": "2026-04-08",
    "driver": {
      "id": "uuid",
      "name": "Udaykumar",
      "phone": "7090842845",
      "license_number": "KA01X1234"
    },
    "vehicle": {
      "id": "uuid",
      "vehicle_number": "KA63A5950",
      "owner_type": "owner"
    },
    "trip_1": {
      "dispatch_time": "05:30:00",
      "store_name": "Tubrahalli ES-131",
      "one_way_km": 52
    },
    "trip_2": {
      "dispatch_time": "13:30:00",
      "store_name": "Sobha Oasis ES-120",
      "one_way_km": 28
    },
    "total_km": 160,
    "gate_pass_image_url": "https://s3.amazonaws.com/...",
    "map_screenshot_url": "https://s3.amazonaws.com/...",
    "status": "pending",
    "remarks": "",
    "created_at": "2026-04-08T10:30:00Z",
    "updated_at": "2026-04-08T10:30:00Z"
  }
}
```

---

### 2.5 Approve Trip
```http
POST /trips/{trip_id}/approve/
```

**Request:**
```json
{
  "remarks": "Approved - KM verified"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Trip approved successfully",
  "data": {
    "id": "uuid",
    "status": "approved",
    "approved_by": {
      "id": "uuid",
      "name": "Coordinator Name"
    },
    "approved_at": "2026-04-08T12:00:00Z"
  }
}
```

---

### 2.6 Reject Trip
```http
POST /trips/{trip_id}/reject/
```

**Request:**
```json
{
  "rejection_reason": "KM mismatch - Please verify"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Trip rejected",
  "data": {
    "id": "uuid",
    "status": "rejected",
    "rejection_reason": "KM mismatch - Please verify",
    "rejected_by": {
      "id": "uuid",
      "name": "Coordinator Name"
    },
    "rejected_at": "2026-04-08T12:00:00Z"
  }
}
```

---

### 2.7 Edit Trip (Admin/Coordinator only)
```http
PATCH /trips/{trip_id}/
Content-Type: multipart/form-data
```

**Request:**
```
one_way_km_1: 55
one_way_km_2: 30
remarks: KM corrected by coordinator
```

**Response (200):**
```json
{
  "success": true,
  "message": "Trip updated successfully",
  "data": {
    "id": "uuid",
    "one_way_km_1": 55,
    "one_way_km_2": 30,
    "total_km": 170,
    "remarks": "KM corrected by coordinator"
  }
}
```

---

## 3. EXPENSE APIs

### 3.1 Create Expense
```http
POST /expenses/
Content-Type: multipart/form-data
```

**Request:**
```
driver_id: uuid (required for admin)
vehicle_id: uuid
expense_type: fuel
trip_id: uuid (optional)
amount: 2500
expense_date: 2026-04-08
description: Diesel fill
payment_mode: phonepay
receipt_image: <file>
```

**Response (201):**
```json
{
  "success": true,
  "message": "Expense recorded successfully",
  "data": {
    "id": "uuid",
    "driver": {
      "id": "uuid",
      "name": "Udaykumar"
    },
    "vehicle": {
      "id": "uuid",
      "vehicle_number": "KA63A5950"
    },
    "expense_type": "fuel",
    "amount": 2500,
    "expense_date": "2026-04-08",
    "description": "Diesel fill",
    "payment_mode": "phonepay",
    "receipt_image_url": "https://s3.amazonaws.com/...",
    "created_at": "2026-04-08T14:00:00Z"
  }
}
```

---

### 3.2 List Expenses
```http
GET /expenses/?driver_id=&vehicle_id=&expense_type=&start_date=&end_date=
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "uuid",
        "driver": {
          "id": "uuid",
          "name": "Udaykumar"
        },
        "vehicle": {
          "id": "uuid",
          "vehicle_number": "KA63A5950"
        },
        "expense_type": "fuel",
        "amount": 2500,
        "expense_date": "2026-04-08",
        "description": "Diesel fill",
        "payment_mode": "phonepay",
        "is_deducted": false
      }
    ],
    "summary": {
      "total_expenses": 15000,
      "by_type": {
        "fuel": 10000,
        "toll": 2000,
        "advance": 3000
      }
    }
  },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 45
  }
}
```

---

### 3.3 Get Driver's Expenses
```http
GET /expenses/my-expenses/
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "expenses": [...],
    "summary": {
      "total_advance_taken": 5000,
      "total_advance_deducted": 3000,
      "remaining_advance": 2000
    }
  }
}
```

---

## 4. VEHICLE APIs

### 4.1 List Vehicles
```http
GET /vehicles/?owner_type=&is_active=true
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "uuid",
        "vehicle_number": "KA63A5950",
        "vehicle_type": "pickup",
        "owner_type": "owner",
        "base_salary": 18000,
        "is_active": true,
        "assigned_drivers": [
          {
            "id": "uuid",
            "name": "Udaykumar",
            "is_primary": true
          }
        ]
      },
      {
        "id": "uuid",
        "vehicle_number": "KA33B6511",
        "vehicle_type": "pickup",
        "owner_type": "vendor",
        "vendor": {
          "id": "uuid",
          "name": "Vendor A Transport"
        },
        "km_rate": 25.50,
        "is_active": true
      }
    ]
  }
}
```

---

### 4.2 Create Vehicle
```http
POST /vehicles/
```

**Request:**
```json
{
  "vehicle_number": "KA63A5950",
  "vehicle_type": "pickup",
  "owner_type": "owner",
  "base_salary": 18000
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "data": {
    "id": "uuid",
    "vehicle_number": "KA63A5950",
    "vehicle_type": "pickup",
    "owner_type": "owner",
    "base_salary": 18000,
    "is_active": true
  }
}
```

---

### 4.3 Assign Driver to Vehicle
```http
POST /vehicles/{vehicle_id}/assign-driver/
```

**Request:**
```json
{
  "driver_id": "uuid",
  "is_primary": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Driver assigned successfully",
  "data": {
    "vehicle_id": "uuid",
    "driver": {
      "id": "uuid",
      "name": "Udaykumar"
    },
    "is_primary": true,
    "assigned_at": "2026-04-08T10:00:00Z"
  }
}
```

---

## 5. DRIVER APIs

### 5.1 List Drivers
```http
GET /drivers/?is_active=true&vehicle_id=
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "drivers": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "first_name": "Udaykumar",
          "last_name": "S",
          "phone": "7090842845"
        },
        "license_number": "KA01X1234",
        "base_salary": 18000,
        "joining_date": "2024-01-15",
        "is_active": true,
        "vehicles": [
          {
            "id": "uuid",
            "vehicle_number": "KA63A5950",
            "is_primary": true
          }
        ]
      }
    ]
  },
  "meta": {
    "total": 12
  }
}
```

---

### 5.2 Create Driver (Admin)
```http
POST /drivers/
```

**Request:**
```json
{
  "first_name": "Udaykumar",
  "last_name": "S",
  "phone": "7090842845",
  "license_number": "KA01X1234",
  "base_salary": 18000,
  "vehicle_id": "uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Driver created successfully",
  "data": {
    "id": "uuid",
    "user": {
      "id": "uuid",
      "first_name": "Udaykumar",
      "phone": "7090842845"
    },
    "license_number": "KA01X1234",
    "base_salary": 18000
  }
}
```

---

### 5.3 Get Driver Detail
```http
GET /drivers/{driver_id}/
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user": {
      "first_name": "Udaykumar",
      "last_name": "S",
      "phone": "7090842845"
    },
    "license_number": "KA01X1234",
    "base_salary": 18000,
    "joining_date": "2024-01-15",
    "is_active": true,
    "vehicles": [...],
    "stats": {
      "total_trips_this_month": 25,
      "total_km_this_month": 2150,
      "total_advance": 5000
    }
  }
}
```

---

## 6. PAYMENT APIs

### 6.1 Calculate Monthly Payment
```http
POST /payments/calculate/
```

**Request:**
```json
{
  "driver_id": "uuid",
  "month_year": "2026-04-01"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "driver_id": "uuid",
    "driver_name": "Udaykumar",
    "month_year": "2026-04-01",
    "vehicle": {
      "id": "uuid",
      "vehicle_number": "KA63A5950",
      "owner_type": "owner"
    },
    "calculation": {
      "total_trips": 25,
      "total_km": 2150,
      "base_salary": 18000,
      "total_advance": 5000,
      "total_fuel_expenses": 8000,
      "total_toll_expenses": 1500,
      "gross_amount": 18000,
      "total_deductions": 5000,
      "final_amount": 13000
    }
  }
}
```

---

### 6.2 Process Payment
```http
POST /payments/
```

**Request:**
```json
{
  "driver_id": "uuid",
  "month_year": "2026-04-01",
  "payment_mode": "phonepay",
  "transaction_reference": "TXN123456",
  "remarks": "April 2026 salary"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "id": "uuid",
    "driver": {
      "id": "uuid",
      "name": "Udaykumar"
    },
    "month_year": "2026-04-01",
    "total_trips": 25,
    "total_km": 2150,
    "base_salary": 18000,
    "total_advance": 5000,
    "final_amount": 13000,
    "status": "paid",
    "paid_at": "2026-05-01T10:00:00Z"
  }
}
```

---

### 6.3 List Payments
```http
GET /payments/?driver_id=&month_year=&status=
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "driver": {
          "id": "uuid",
          "name": "Udaykumar"
        },
        "month_year": "2026-04-01",
        "total_trips": 25,
        "total_km": 2150,
        "final_amount": 13000,
        "status": "paid",
        "paid_at": "2026-05-01T10:00:00Z"
      }
    ]
  }
}
```

---

## 7. DASHBOARD APIs

### 7.1 Owner Dashboard
```http
GET /dashboard/owner/
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start_date": "2026-04-01",
      "end_date": "2026-04-30"
    },
    "trips": {
      "total": 450,
      "approved": 420,
      "pending": 25,
      "rejected": 5,
      "total_km": 48500
    },
    "expenses": {
      "fuel": 125000,
      "toll": 25000,
      "advance": 75000,
      "allowance": 15000,
      "total": 240000
    },
    "payments": {
      "total_salary_paid": 180000,
      "total_vendor_paid": 85000,
      "pending_payments": 25000
    },
    "top_performers": [
      {
        "driver_id": "uuid",
        "driver_name": "Udaykumar",
        "total_trips": 28,
        "total_km": 2450
      }
    ],
    "vehicle_utilization": [
      {
        "vehicle_id": "uuid",
        "vehicle_number": "KA63A5950",
        "total_trips": 28,
        "total_km": 2450,
        "owner_type": "owner"
      }
    ]
  }
}
```

---

### 7.2 Driver Dashboard
```http
GET /dashboard/driver/
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": {
      "start_date": "2026-04-01",
      "end_date": "2026-04-30"
    },
    "trips": {
      "total": 25,
      "approved": 22,
      "pending": 3,
      "total_km": 2150
    },
    "expenses": {
      "advance_taken": 5000,
      "advance_deducted": 3000,
      "remaining_advance": 2000
    },
    "salary": {
      "base_salary": 18000,
      "deductions": 5000,
      "final_amount": 13000,
      "status": "pending"
    },
    "recent_trips": [
      {
        "id": "uuid",
        "trip_date": "2026-04-08",
        "store_name_1": "Tubrahalli ES-131",
        "total_km": 160,
        "status": "pending"
      }
    ]
  }
}
```

---

### 7.3 Daily Summary
```http
GET /dashboard/daily-summary/?date=2026-04-08
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-04-08",
    "trips": {
      "total": 18,
      "pending": 3,
      "approved": 15,
      "total_km": 1850
    },
    "driver_attendance": [
      {
        "driver_id": "uuid",
        "driver_name": "Udaykumar",
        "trip_1": true,
        "trip_2": true,
        "total_km": 160
      }
    ]
  }
}
```

---

## 8. VENDOR APIs

### 8.1 List Vendors
```http
GET /vendors/
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "uuid",
        "name": "Vendor A Transport",
        "phone": "9876543210",
        "email": "vendor@example.com",
        "vehicles_count": 2,
        "total_km_this_month": 4500,
        "pending_payment": 85000
      }
    ]
  }
}
```

---

### 8.2 Create Vendor
```http
POST /vendors/
```

**Request:**
```json
{
  "name": "Vendor A Transport",
  "phone": "9876543210",
  "email": "vendor@example.com",
  "address": "Bangalore",
  "contact_person": "Mr. Sharma"
}
```

---

## Error Codes Reference

| HTTP Code | Error Code | Description |
|-----------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 401 | AUTHENTICATION_FAILED | Invalid credentials |
| 403 | PERMISSION_DENIED | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | DUPLICATE_ENTRY | Resource already exists |
| 422 | INVALID_OPERATION | Cannot perform operation |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| /auth/otp/send/ | 5 per minute per phone |
| /auth/otp/verify/ | 3 attempts per OTP |
| All other endpoints | 100 per minute per user |

---

*Document Version: 1.0*
*Last Updated: April 2026*
