import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  MapPin,
  User,
  Truck,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTrips } from '../../hooks/useTrips';
import { format } from 'date-fns';

const TripsManagement = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: '',
  });
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { trips, pendingTrips, isLoading, approveTrip, rejectTrip, isApproving, isRejecting } =
    useTrips(filters);

  const displayTrips = filters.status === 'pending' ? pendingTrips : trips;

  const handleApprove = (tripId) => {
    approveTrip(
      { tripId, remarks: 'Approved' },
      {
        onSuccess: () => {
          setSelectedTrip(null);
        },
      }
    );
  };

  const handleReject = (tripId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectTrip(
      { tripId, reason: rejectionReason },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectionReason('');
          setSelectedTrip(null);
        },
      }
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Trips Management</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {pendingTrips.length > 0 && (
              <span className="text-yellow-600 font-medium">
                {pendingTrips.length} pending
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            onClick={() => setFilters({ status: '', start_date: '', end_date: '' })}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Driver
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stores
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  KM
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No trips found
                  </td>
                </tr>
              ) : (
                displayTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {format(new Date(trip.trip_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{trip.driver_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{trip.vehicle_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {trip.trip_1?.store_name}
                        {trip.trip_2?.store_name && (
                          <span className="text-gray-500">
                            {' '}& {trip.trip_2.store_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{trip.total_km} km</span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(trip.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTrip(trip)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {trip.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(trip.id)}
                              disabled={isApproving}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTrip(trip);
                                setShowRejectModal(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trip Detail Modal */}
      {selectedTrip && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Images */}
              <div className="grid grid-cols-2 gap-4">
                {selectedTrip.gate_pass_image_url && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Gate Pass</p>
                    <img
                      src={selectedTrip.gate_pass_image_url}
                      alt="Gate Pass"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                {selectedTrip.map_screenshot_url && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Map Screenshot</p>
                    <img
                      src={selectedTrip.map_screenshot_url}
                      alt="Map"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">
                    {format(new Date(selectedTrip.trip_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Driver</span>
                  <span className="font-medium">{selectedTrip.driver_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-medium">{selectedTrip.vehicle_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total KM</span>
                  <span className="font-medium">{selectedTrip.total_km} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  {getStatusBadge(selectedTrip.status)}
                </div>
              </div>

              {/* Trip Details */}
              {selectedTrip.trip_1 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Trip 1</h3>
                  <p className="text-sm text-gray-600">
                    {selectedTrip.trip_1.store_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedTrip.trip_1.one_way_km} km (one-way)
                  </p>
                </div>
              )}

              {selectedTrip.trip_2 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Trip 2</h3>
                  <p className="text-sm text-gray-600">
                    {selectedTrip.trip_2.store_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedTrip.trip_2.one_way_km} km (one-way)
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedTrip.status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleApprove(selectedTrip.id)}
                    disabled={isApproving}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:bg-gray-300"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-700"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reject Trip</h2>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this trip.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedTrip.id)}
                disabled={isRejecting}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:bg-gray-300"
              >
                {isRejecting ? 'Rejecting...' : 'Reject Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsManagement;
