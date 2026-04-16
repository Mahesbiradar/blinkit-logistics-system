import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import DriverLayout from './pages/driver/DriverLayout';
import AdminLayout from './pages/admin/AdminLayout';

import Login from './pages/auth/Login';
import OTPVerify from './pages/auth/OTPVerify';
import DriverRegister from './pages/auth/DriverRegister';
import ForgotPassword from './pages/auth/ForgotPassword';

import DriverDashboard from './pages/driver/DriverDashboard';
import AddTrip from './pages/driver/AddTrip';
import MyTrips from './pages/driver/MyTrips';
import MyExpenses from './pages/driver/MyExpenses';

import AdminDashboard from './pages/admin/AdminDashboard';
import TripsManagement from './pages/admin/TripsManagement';
import DriversManagement from './pages/admin/DriversManagement';
import VehiclesManagement from './pages/admin/VehiclesManagement';
import ExpensesManagement from './pages/admin/ExpensesManagement';
import PaymentsManagement from './pages/admin/PaymentsManagement';

const DriverRoute = ({ children }) => {
  const { isAuthenticated, isDriver, getHomeRoute } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isDriver()) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isOwner, isCoordinator, getHomeRoute } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isOwner() && !isCoordinator()) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, getHomeRoute } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  return children;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/verify-otp',
    element: (
      <PublicRoute>
        <OTPVerify />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPassword />
      </PublicRoute>
    ),
  },
  {
    path: '/driver/register',
    element: (
      <PublicRoute>
        <DriverRegister />
      </PublicRoute>
    ),
  },
  {
    path: '/driver',
    element: (
      <DriverRoute>
        <DriverLayout />
      </DriverRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DriverDashboard /> },
      { path: 'add-trip', element: <AddTrip /> },
      { path: 'trips/new', element: <AddTrip /> },
      { path: 'my-trips', element: <MyTrips /> },
      { path: 'trips', element: <MyTrips /> },
      { path: 'my-expenses', element: <MyExpenses /> },
      { path: 'expenses', element: <MyExpenses /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'trips', element: <TripsManagement /> },
      { path: 'drivers', element: <DriversManagement /> },
      { path: 'vehicles', element: <VehiclesManagement /> },
      { path: 'expenses', element: <ExpensesManagement /> },
      { path: 'payments', element: <PaymentsManagement /> },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
