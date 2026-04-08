# Blinkit Logistics System - Frontend Architecture

## 1. Project Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # PWA service worker
│   └── icons/                 # App icons
│
├── src/
│   ├── components/
│   │   ├── common/            # Shared components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Loading.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── ImageUpload.jsx
│   │   │   └── StatusBadge.jsx
│   │   │
│   │   ├── driver/            # Driver-specific components
│   │   │   ├── TripForm.jsx
│   │   │   ├── TripCard.jsx
│   │   │   ├── TripList.jsx
│   │   │   ├── ExpenseForm.jsx
│   │   │   └── DriverStats.jsx
│   │   │
│   │   └── admin/             # Admin/Coordinator components
│   │       ├── TripTable.jsx
│   │       ├── TripFilter.jsx
│   │       ├── DriverTable.jsx
│   │       ├── VehicleTable.jsx
│   │       ├── ExpenseTable.jsx
│   │       ├── PaymentTable.jsx
│   │       ├── DashboardStats.jsx
│   │       ├── Charts/
│   │       │   ├── TripChart.jsx
│   │       │   ├── ExpenseChart.jsx
│   │       │   └── KmChart.jsx
│   │       └── ApprovalActions.jsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── OTPVerify.jsx
│   │   │   └── DriverRegister.jsx
│   │   │
│   │   ├── driver/
│   │   │   ├── DriverLayout.jsx
│   │   │   ├── DriverDashboard.jsx
│   │   │   ├── AddTrip.jsx
│   │   │   ├── MyTrips.jsx
│   │   │   └── MyExpenses.jsx
│   │   │
│   │   └── admin/
│   │       ├── AdminLayout.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── TripsManagement.jsx
│   │       ├── DriversManagement.jsx
│   │       ├── VehiclesManagement.jsx
│   │       ├── ExpensesManagement.jsx
│   │       ├── PaymentsManagement.jsx
│   │       └── Reports.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useTrips.js
│   │   ├── useExpenses.js
│   │   ├── useDrivers.js
│   │   ├── useVehicles.js
│   │   ├── usePayments.js
│   │   ├── useDashboard.js
│   │   └── useImageUpload.js
│   │
│   ├── services/
│   │   ├── api.js               # Axios instance
│   │   ├── authService.js
│   │   ├── tripService.js
│   │   ├── expenseService.js
│   │   ├── driverService.js
│   │   ├── vehicleService.js
│   │   ├── paymentService.js
│   │   └── dashboardService.js
│   │
│   ├── store/
│   │   ├── authStore.js         # Zustand auth store
│   │   ├── tripStore.js
│   │   └── uiStore.js
│   │
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   ├── formatters.js
│   │   └── validators.js
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── tailwind.config.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── routes.jsx
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 2. Component Design

### 2.1 Driver UI Components (Mobile-First)

```jsx
// Driver Trip Form - 2 Step Process
// ==================================

// Step 1: Image Upload
┌─────────────────────────────┐
│  ← Add Trip          [Logo] │
├─────────────────────────────┤
│                             │
│  Step 1 of 2                │
│  ───────────────            │
│                             │
│  📷 Upload Gate Pass        │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   [Camera Icon]     │    │
│  │   Tap to capture    │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  📍 Upload Map Screenshot   │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │   [Map Icon]        │    │
│  │   Tap to upload     │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│                             │
│  ┌─────────────────────┐    │
│  │    NEXT STEP →      │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘

// Step 2: Trip Details
┌─────────────────────────────┐
│  ← Trip Details      [Logo] │
├─────────────────────────────┤
│                             │
│  Step 2 of 2                │
│  ─────────────────          │
│                             │
│  🚚 Trip 1                  │
│  ─────────                  │
│                             │
│  Store Name *               │
│  ┌─────────────────────┐    │
│  │ Tubrahalli ES-131   │    │
│  └─────────────────────┘    │
│                             │
│  One-way KM *               │
│  ┌─────────────────────┐    │
│  │ 52                  │    │
│  └─────────────────────┘    │
│                             │
│  🚚 Trip 2 (Optional)       │
│  ─────────────────────      │
│                             │
│  Store Name                 │
│  ┌─────────────────────┐    │
│  │ Sobha Oasis ES-120  │    │
│  └─────────────────────┘    │
│                             │
│  One-way KM                 │
│  ┌─────────────────────┐    │
│  │ 28                  │    │
│  └─────────────────────┘    │
│                             │
│  ─────────────────────────  │
│  Total KM: 160 km           │
│  ─────────────────────────  │
│                             │
│  ┌─────────────────────┐    │
│  │   SUBMIT TRIP ✓     │    │
│  └─────────────────────┘    │
│                             │
└─────────────────────────────┘
```

### 2.2 Admin UI Components

```jsx
// Trips Management Table
// =======================

┌─────────────────────────────────────────────────────────────────────────┐
│  Trips Management                                    [+ Add Trip]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filters:                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Driver ▼ │ │ Vehicle ▼│ │ Status ▼ │ │ Date ▼   │ │ [Apply]      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Date       │ Driver    │ Vehicle   │ KM   │ Status    │ Actions │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ 08-Apr     │ Udaykumar │ KA63A5950 │ 160  │ 🟡 Pending│ ✓ ✗ 👁  │   │
│  │ 08-Apr     │ Manjunath │ KA63A5947 │ 142  │ 🟢 Approve│ ✓ ✗ 👁  │   │
│  │ 07-Apr     │ Sagar     │ KA63A5948 │ 104  │ 🟢 Approve│ ✓ ✗ 👁  │   │
│  │ 07-Apr     │ Mantayya  │ KA33B6511 │ 118  │ 🟡 Pending│ ✓ ✗ 👁  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Showing 1-10 of 150 trips                    [1] [2] [3] ... [15] >    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. State Management

### 3.1 Auth Store (Zustand)

```javascript
// store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      driverProfile: null,
      
      setAuth: (user, tokens, driverProfile = null) => set({
        user,
        tokens,
        driverProfile,
        isAuthenticated: true
      }),
      
      clearAuth: () => set({
        user: null,
        tokens: null,
        driverProfile: null,
        isAuthenticated: false
      }),
      
      updateTokens: (tokens) => set({ tokens }),
      
      getAccessToken: () => get().tokens?.access,
      getRefreshToken: () => get().tokens?.refresh,
      
      isOwner: () => get().user?.role === 'owner',
      isCoordinator: () => get().user?.role === 'coordinator',
      isDriver: () => get().user?.role === 'driver',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        tokens: state.tokens,
        driverProfile: state.driverProfile,
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
);
```

### 3.2 Trip Store

```javascript
// store/tripStore.js
import { create } from 'zustand';

export const useTripStore = create((set, get) => ({
  trips: [],
  currentTrip: null,
  filters: {
    status: '',
    driverId: '',
    vehicleId: '',
    startDate: '',
    endDate: ''
  },
  pagination: {
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0
  },
  isLoading: false,
  error: null,
  
  setTrips: (trips, pagination) => set({ 
    trips, 
    pagination: pagination || get().pagination 
  }),
  
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  
  updateTripStatus: (tripId, status) => set((state) => ({
    trips: state.trips.map(t => 
      t.id === tripId ? { ...t, status } : t
    )
  })),
  
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
  
  clearFilters: () => set({
    filters: {
      status: '',
      driverId: '',
      vehicleId: '',
      startDate: '',
      endDate: ''
    }
  }),
  
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error })
}));
```

---

## 4. Custom Hooks

### 4.1 useAuth Hook

```javascript
// hooks/useAuth.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import authService from '../services/authService';

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAuth, clearAuth, user, isAuthenticated, isDriver } = useAuthStore();
  
  const sendOTPMutation = useMutation({
    mutationFn: authService.sendOTP,
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    }
  });
  
  const verifyOTPMutation = useMutation({
    mutationFn: authService.verifyOTP,
    onSuccess: (response) => {
      const { user, tokens, driver_profile, is_new_user } = response.data;
      
      if (is_new_user) {
        // Store temp token and redirect to registration
        localStorage.setItem('temp_token', response.data.temp_token);
        navigate('/driver/register');
      } else {
        setAuth(user, tokens, driver_profile);
        navigate(isDriver() ? '/driver/dashboard' : '/admin/dashboard');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    }
  });
  
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (response) => {
      const { user, tokens } = response.data;
      setAuth(user, tokens);
      navigate('/admin/dashboard');
    }
  });
  
  const logout = () => {
    clearAuth();
    queryClient.clear();
    navigate('/login');
  };
  
  return {
    user,
    isAuthenticated,
    sendOTP: sendOTPMutation.mutate,
    verifyOTP: verifyOTPMutation.mutate,
    login: loginMutation.mutate,
    logout,
    isLoading: sendOTPMutation.isPending || verifyOTPMutation.isPending
  };
};
```

### 4.2 useTrips Hook

```javascript
// hooks/useTrips.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import tripService from '../services/tripService';
import { useTripStore } from '../store/tripStore';

export const useTrips = (filters = {}) => {
  const queryClient = useQueryClient();
  const { setTrips, updateTripStatus } = useTripStore();
  
  // Fetch trips
  const tripsQuery = useQuery({
    queryKey: ['trips', filters],
    queryFn: () => tripService.getTrips(filters),
    onSuccess: (response) => {
      setTrips(response.data.trips, response.meta);
    }
  });
  
  // Create trip
  const createTripMutation = useMutation({
    mutationFn: tripService.createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip created successfully');
    }
  });
  
  // Approve trip
  const approveTripMutation = useMutation({
    mutationFn: ({ tripId, remarks }) => 
      tripService.approveTrip(tripId, remarks),
    onSuccess: (_, variables) => {
      updateTripStatus(variables.tripId, 'approved');
      toast.success('Trip approved');
    }
  });
  
  // Reject trip
  const rejectTripMutation = useMutation({
    mutationFn: ({ tripId, reason }) => 
      tripService.rejectTrip(tripId, reason),
    onSuccess: (_, variables) => {
      updateTripStatus(variables.tripId, 'rejected');
      toast.success('Trip rejected');
    }
  });
  
  return {
    trips: tripsQuery.data?.data?.trips || [],
    isLoading: tripsQuery.isLoading,
    error: tripsQuery.error,
    createTrip: createTripMutation.mutate,
    approveTrip: approveTripMutation.mutate,
    rejectTrip: rejectTripMutation.mutate,
    refetch: tripsQuery.refetch
  };
};
```

---

## 5. API Service Layer

```javascript
// services/api.js
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = useAuthStore.getState().getRefreshToken();
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken
        });
        
        const { access } = response.data.data;
        useAuthStore.getState().updateTokens({ 
          access, 
          refresh: refreshToken 
        });
        
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## 6. Routing Structure

```jsx
// routes.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import DriverLayout from './pages/driver/DriverLayout';
import AdminLayout from './pages/admin/AdminLayout';

// Auth Pages
import Login from './pages/auth/Login';
import OTPVerify from './pages/auth/OTPVerify';
import DriverRegister from './pages/auth/DriverRegister';

// Driver Pages
import DriverDashboard from './pages/driver/DriverDashboard';
import AddTrip from './pages/driver/AddTrip';
import MyTrips from './pages/driver/MyTrips';
import MyExpenses from './pages/driver/MyExpenses';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import TripsManagement from './pages/admin/TripsManagement';
import DriversManagement from './pages/admin/DriversManagement';
import VehiclesManagement from './pages/admin/VehiclesManagement';
import ExpensesManagement from './pages/admin/ExpensesManagement';
import PaymentsManagement from './pages/admin/PaymentsManagement';

// Protected Route Components
const DriverRoute = ({ children }) => {
  const { isAuthenticated, isDriver } = useAuthStore();
  return isAuthenticated && isDriver() ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isOwner, isCoordinator } = useAuthStore();
  return isAuthenticated && (isOwner() || isCoordinator()) 
    ? children 
    : <Navigate to="/login" />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/verify-otp',
    element: <OTPVerify />
  },
  {
    path: '/driver/register',
    element: <DriverRegister />
  },
  {
    path: '/driver',
    element: <DriverRoute><DriverLayout /></DriverRoute>,
    children: [
      { path: 'dashboard', element: <DriverDashboard /> },
      { path: 'add-trip', element: <AddTrip /> },
      { path: 'my-trips', element: <MyTrips /> },
      { path: 'my-expenses', element: <MyExpenses /> },
      { path: '', element: <Navigate to="dashboard" /> }
    ]
  },
  {
    path: '/admin',
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'trips', element: <TripsManagement /> },
      { path: 'drivers', element: <DriversManagement /> },
      { path: 'vehicles', element: <VehiclesManagement /> },
      { path: 'expenses', element: <ExpensesManagement /> },
      { path: 'payments', element: <PaymentsManagement /> },
      { path: '', element: <Navigate to="dashboard" /> }
    ]
  },
  {
    path: '/',
    element: <Navigate to="/login" />
  }
]);
```

---

## 7. Mobile-First Design Guidelines

### 7.1 Touch Targets
- Minimum 48x48px for buttons
- Minimum 44px height for inputs
- 8px minimum spacing between touch targets

### 7.2 Typography
- Base font size: 16px (prevents iOS zoom)
- Headings: 20-24px
- Body: 16px
- Small text: 14px

### 7.3 Colors
```css
:root {
  /* Primary */
  --color-primary: #2563eb;
  --color-primary-dark: #1d4ed8;
  --color-primary-light: #3b82f6;
  
  /* Status */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;
  
  /* Status Backgrounds */
  --color-success-bg: #d1fae5;
  --color-warning-bg: #fef3c7;
  --color-danger-bg: #fee2e2;
  
  /* Grays */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
}
```

### 7.4 Status Badges
```jsx
// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    paid: 'bg-blue-100 text-blue-800 border-blue-200'
  };
  
  const labels = {
    pending: '⏳ Pending',
    approved: '✓ Approved',
    rejected: '✗ Rejected',
    paid: '✓ Paid'
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};
```

---

## 8. PWA Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'JJR Logistics',
        short_name: 'JJR Logistics',
        description: 'Trip & Expense Management System',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.jjrlogistics\.com\/api\/v1/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400
              }
            }
          }
        ]
      }
    })
  ]
});
```

---

*Document Version: 1.0*
*Last Updated: April 2026*
