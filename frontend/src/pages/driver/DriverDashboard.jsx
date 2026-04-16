import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  Clock,
  List,
  MapPin,
  Plus,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react';
import { useDriverDashboard } from '../../hooks/useDashboard';
import { useAuthStore } from '../../store/authStore';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, driverProfile } = useAuthStore();
  const { data, isLoading } = useDriverDashboard();

  const dashboardData = data?.data?.data || {};
  const trips = dashboardData.trips || {};
  const salary = dashboardData.salary || {};
  const expenses = dashboardData.expenses || {};
  const recentTrips = dashboardData.recent_trips || [];
  const period = dashboardData.period || {};
  const firstName = user?.first_name || 'Driver';
  const assignedVehicle = driverProfile?.primary_vehicle?.vehicle_number || 'Not assigned';

  const statsCards = [
    {
      title: 'Total Trips',
      value: trips.total || 0,
      icon: MapPin,
      color: 'bg-blue-500',
      trend: `${trips.approved || 0} approved`,
    },
    {
      title: 'Total KM',
      value: `${trips.total_km || 0} km`,
      icon: TrendingUp,
      color: 'bg-green-500',
      trend: 'This month',
    },
    {
      title: 'Pending Trips',
      value: trips.pending || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      trend: 'Awaiting approval',
    },
    {
      title: 'Expected Salary',
      value: `Rs. ${Number(salary.final_amount || 0).toLocaleString('en-IN')}`,
      icon: Wallet,
      color: 'bg-purple-500',
      trend: `Status: ${salary.status || 'pending'}`,
    },
  ];

  const quickActions = [
    {
      title: 'Add New Trip',
      description: 'Upload gate pass and map proof',
      icon: Plus,
      color: 'bg-blue-600',
      onClick: () => navigate('/driver/add-trip'),
    },
    {
      title: 'View My Trips',
      description: 'Check trip history and approvals',
      icon: List,
      color: 'bg-green-600',
      onClick: () => navigate('/driver/my-trips'),
    },
    {
      title: 'My Expenses',
      description: 'Track advances and expense entries',
      icon: Wallet,
      color: 'bg-purple-600',
      onClick: () => navigate('/driver/my-expenses'),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {firstName}</h1>
            <p className="mt-2 text-sm text-blue-100">
              Stay on top of your trips, approvals, salary, and advances from one place.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-wide text-blue-100">Assigned vehicle</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <Truck className="h-4 w-4" />
                {assignedVehicle}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-wide text-blue-100">Reporting period</div>
              <div className="mt-1 text-sm font-semibold">
                {period.start_date || '--'} to {period.end_date || '--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {statsCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.title}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.trend}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className={`${action.color} p-3 rounded-xl`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Trips</h2>
          <button
            onClick={() => navigate('/driver/my-trips')}
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            View All
          </button>
        </div>

        {recentTrips.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No trips yet this month</p>
            <button
              onClick={() => navigate('/driver/add-trip')}
              className="mt-4 text-blue-600 font-medium hover:underline"
            >
              Add your first trip
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTrips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {trip.store_name_1}
                      {trip.store_name_2 ? ` and ${trip.store_name_2}` : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(trip.trip_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' | '}
                      {trip.total_km} km
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {trip.status === 'approved' ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Approved
                      </span>
                    ) : trip.status === 'pending' ? (
                      <span className="flex items-center gap-1 text-yellow-600 text-sm">
                        <Clock className="w-4 h-4" />
                        Pending
                      </span>
                    ) : (
                      <span className="text-red-600 text-sm">Rejected</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {expenses.remaining_advance > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-yellow-800">
                Advance Balance: Rs. {Number(expenses.remaining_advance || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-yellow-600">
                This will be deducted from your salary
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
