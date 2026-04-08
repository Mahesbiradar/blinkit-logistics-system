import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  MapPin,
  Wallet,
  Users,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
} from 'lucide-react';
import { useOwnerDashboard } from '../../hooks/useDashboard';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    start_date: format(new Date().setDate(1), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data, isLoading } = useOwnerDashboard(dateRange);
  const dashboardData = data?.data?.data || {};

  const trips = dashboardData.trips || {};
  const expenses = dashboardData.expenses || {};
  const payments = dashboardData.payments || {};
  const topPerformers = dashboardData.top_performers || [];
  const vehicleUtilization = dashboardData.vehicle_utilization || [];

  const statsCards = [
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
      value: `${(trips.total_km || 0).toLocaleString()} km`,
      trend: 'This period',
      icon: TrendingUp,
      color: 'bg-green-500',
      trendUp: true,
    },
    {
      title: 'Total Expenses',
      value: `₹${(expenses.total || 0).toLocaleString()}`,
      trend: 'All categories',
      icon: Wallet,
      color: 'bg-red-500',
      trendUp: false,
    },
    {
      title: 'Pending Payments',
      value: `₹${(payments.pending_payments || 0).toLocaleString()}`,
      trend: 'To be processed',
      icon: Users,
      color: 'bg-yellow-500',
      trendUp: false,
    },
  ];

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
      description: 'Salary & vendor payments',
      icon: Wallet,
      color: 'bg-orange-600',
      onClick: () => navigate('/admin/payments'),
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            {format(new Date(dateRange.start_date), 'MMM d')} -{' '}
            {format(new Date(dateRange.end_date), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.title}</p>
              <div className="flex items-center gap-1 mt-2">
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link, index) => (
          <button
            key={index}
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top Performers</h2>
          </div>
          <div className="p-4">
            {topPerformers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No data available</p>
            ) : (
              <div className="space-y-4">
                {topPerformers.map((performer, index) => (
                  <div
                    key={performer.driver_id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {performer.driver_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {performer.total_trips} trips
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {performer.total_km.toLocaleString()} km
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Utilization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Vehicle Utilization
            </h2>
          </div>
          <div className="p-4">
            {vehicleUtilization.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No data available</p>
            ) : (
              <div className="space-y-4">
                {vehicleUtilization.map((vehicle) => (
                  <div
                    key={vehicle.vehicle_id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          vehicle.owner_type === 'owner'
                            ? 'bg-blue-500'
                            : 'bg-purple-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {vehicle.vehicle_number}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          {vehicle.owner_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {vehicle.total_km.toLocaleString()} km
                      </p>
                      <p className="text-sm text-gray-500">
                        {vehicle.total_trips} trips
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Expense Breakdown</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(expenses.by_type || {}).map(([type, amount]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 capitalize">{type}</p>
                <p className="text-lg font-semibold text-gray-900">
                  ₹{amount.toLocaleString()}
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
