import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  List, 
  Wallet, 
  MapPin, 
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useDriverDashboard } from '../../hooks/useDashboard';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useDriverDashboard();

  const dashboardData = data?.data || {};
  const trips = dashboardData.trips || {};
  const salary = dashboardData.salary || {};
  const expenses = dashboardData.expenses || {};
  const recentTrips = dashboardData.recent_trips || [];

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
      value: `₹${(salary.final_amount || 0).toLocaleString()}`,
      icon: Wallet,
      color: 'bg-purple-500',
      trend: salary.status || 'pending',
    },
  ];

  const quickActions = [
    {
      title: 'Add New Trip',
      description: 'Upload gate pass & map',
      icon: Plus,
      color: 'bg-blue-600',
      onClick: () => navigate('/driver/add-trip'),
    },
    {
      title: 'View My Trips',
      description: 'Check trip history',
      icon: List,
      color: 'bg-green-600',
      onClick: () => navigate('/driver/my-trips'),
    },
    {
      title: 'My Expenses',
      description: 'Track advances & fuel',
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
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-blue-100 mt-1">
          Here's your summary for this month
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
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

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
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

      {/* Recent Trips */}
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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {trip.store_name_1}
                      {trip.store_name_2 && ` & ${trip.store_name_2}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(trip.trip_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' • '}
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

      {/* Advance Info */}
      {expenses.remaining_advance > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-yellow-800">
                Advance Balance: ₹{expenses.remaining_advance.toLocaleString()}
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
