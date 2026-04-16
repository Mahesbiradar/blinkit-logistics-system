import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Filter,
  MapPin,
  PlusCircle,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { useOwnerDashboard } from '../../hooks/useDashboard';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';

const initialCoordinatorForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isOwner } = useAuthStore();
  const { createCoordinator, isCreatingCoordinator } = useAuth();
  const [dateRange, setDateRange] = useState({
    start_date: format(new Date().setDate(1), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [showCoordinatorForm, setShowCoordinatorForm] = useState(false);
  const [coordinatorForm, setCoordinatorForm] = useState(initialCoordinatorForm);

  const { data, isLoading, isError, error, refetch } = useOwnerDashboard(dateRange);
  const dashboardData = data?.data?.data || {};

  const trips = dashboardData.trips || {};
  const expenses = dashboardData.expenses || {};
  const payments = dashboardData.payments || {};
  const topPerformers = dashboardData.top_performers || [];
  const vehicleUtilization = dashboardData.vehicle_utilization || [];

  const statsCards = useMemo(
    () => [
      {
        title: 'Total Trips',
        value: trips.total || 0,
        trend: `${trips.approved || 0} approved`,
        icon: MapPin,
        color: 'bg-blue-500',
        trendUp: true,
      },
      {
        title: 'Total KM',
        value: `${Number(trips.total_km || 0).toLocaleString('en-IN')} km`,
        trend: 'This period',
        icon: TrendingUp,
        color: 'bg-green-500',
        trendUp: true,
      },
      {
        title: 'Total Expenses',
        value: `Rs. ${Number(expenses.total || 0).toLocaleString('en-IN')}`,
        trend: 'All categories',
        icon: Wallet,
        color: 'bg-red-500',
        trendUp: false,
      },
      {
        title: 'Pending Payments',
        value: `Rs. ${Number(payments.pending_payments || 0).toLocaleString('en-IN')}`,
        trend: 'To be processed',
        icon: Users,
        color: 'bg-yellow-500',
        trendUp: false,
      },
    ],
    [expenses.total, payments.pending_payments, trips.approved, trips.total, trips.total_km]
  );

  const quickLinks = [
    {
      title: 'Manage Trips',
      description: `${trips.pending || 0} pending approvals`,
      icon: MapPin,
      color: 'bg-blue-600',
      onClick: () => navigate('/admin/trips'),
    },
    {
      title: 'Manage Drivers',
      description: 'View driver performance',
      icon: Users,
      color: 'bg-green-600',
      onClick: () => navigate('/admin/drivers'),
    },
    {
      title: 'Manage Vehicles',
      description: 'Track vehicle utilization',
      icon: Truck,
      color: 'bg-purple-600',
      onClick: () => navigate('/admin/vehicles'),
    },
    {
      title: 'Process Payments',
      description: 'Salary and vendor payments',
      icon: Wallet,
      color: 'bg-orange-600',
      onClick: () => navigate('/admin/payments'),
    },
  ];

  const handleCreateCoordinator = (event) => {
    event.preventDefault();

    createCoordinator(coordinatorForm, {
      onSuccess: () => {
        setCoordinatorForm(initialCoordinatorForm);
        setShowCoordinatorForm(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-900">Unable to load dashboard</h1>
        <p className="mt-2 text-sm text-red-700">
          {error?.response?.data?.message || error?.message || 'Something went wrong while loading the dashboard.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            {format(new Date(dateRange.start_date), 'MMM d')} to{' '}
            {format(new Date(dateRange.end_date), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(event) => setDateRange((current) => ({ ...current, start_date: event.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(event) => setDateRange((current) => ({ ...current, end_date: event.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {isOwner() ? (
            <button
              onClick={() => setShowCoordinatorForm((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4" />
              {showCoordinatorForm ? 'Close Coordinator Form' : 'Create Coordinator'}
            </button>
          ) : null}
        </div>
      </div>

      {showCoordinatorForm && isOwner() ? (
        <form onSubmit={handleCreateCoordinator} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create Coordinator</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">First name</span>
              <input
                required
                value={coordinatorForm.first_name}
                onChange={(event) =>
                  setCoordinatorForm((current) => ({ ...current, first_name: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Last name</span>
              <input
                value={coordinatorForm.last_name}
                onChange={(event) =>
                  setCoordinatorForm((current) => ({ ...current, last_name: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                required
                value={coordinatorForm.email}
                onChange={(event) =>
                  setCoordinatorForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Phone</span>
              <input
                required
                value={coordinatorForm.phone}
                onChange={(event) =>
                  setCoordinatorForm((current) => ({
                    ...current,
                    phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                required
                value={coordinatorForm.password}
                onChange={(event) =>
                  setCoordinatorForm((current) => ({ ...current, password: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setCoordinatorForm(initialCoordinatorForm);
                setShowCoordinatorForm(false);
              }}
              className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingCoordinator}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isCreatingCoordinator ? 'Creating...' : 'Create Coordinator'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.title}</p>
              <div className="mt-2 flex items-center gap-1">
                {stat.trendUp ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <button
            key={link.title}
            onClick={link.onClick}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
          >
            <div className={`${link.color} p-3 rounded-xl`}>
              <link.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{link.title}</h3>
              <p className="text-sm text-gray-500">{link.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top Performers</h2>
          </div>
          <div className="p-4">
            {topPerformers.length === 0 ? (
              <p className="py-4 text-center text-gray-500">No data available</p>
            ) : (
              <div className="space-y-4">
                {topPerformers.map((performer, index) => (
                  <div key={performer.driver_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{performer.driver_name}</p>
                        <p className="text-sm text-gray-500">{performer.total_trips} trips</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {Number(performer.total_km || 0).toLocaleString('en-IN')} km
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Vehicle Utilization</h2>
          </div>
          <div className="p-4">
            {vehicleUtilization.length === 0 ? (
              <p className="py-4 text-center text-gray-500">No data available</p>
            ) : (
              <div className="space-y-4">
                {vehicleUtilization.map((vehicle) => (
                  <div key={vehicle.vehicle_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          vehicle.owner_type === 'owner' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{vehicle.vehicle_number}</p>
                        <p className="text-sm capitalize text-gray-500">{vehicle.owner_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {Number(vehicle.total_km || 0).toLocaleString('en-IN')} km
                      </p>
                      <p className="text-sm text-gray-500">{vehicle.total_trips} trips</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Expense Breakdown</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(expenses.by_type || {}).map(([type, amount]) => (
              <div key={type} className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm capitalize text-gray-500">{type}</p>
                <p className="text-lg font-semibold text-gray-900">
                  Rs. {Number(amount || 0).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
