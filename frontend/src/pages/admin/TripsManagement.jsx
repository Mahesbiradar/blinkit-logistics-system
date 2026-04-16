import { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useTrips } from '../../hooks/useTrips';

const TripsManagement = () => {
  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: '',
  });
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('Approved');
  const [actionTripId, setActionTripId] = useState(null);

  const {
    trips,
    pendingTrips,
    isLoading,
    isError,
    error,
    approveTrip,
    rejectTrip,
    isApproving,
    isRejecting,
    refetch,
  } = useTrips(filters);

  const displayTrips = filters.status === 'pending' ? pendingTrips : trips;

  const handleApprove = (tripId, remarks = approvalRemarks) => {
    setActionTripId(tripId);
    approveTrip(
      { tripId, remarks },
      {
        onSuccess: () => {
          setSelectedTrip(null);
          setApprovalRemarks('Approved');
          setActionTripId(null);
        },
        onError: () => {
          setActionTripId(null);
        },
      }
    );
  };

  const handleReject = (tripId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionTripId(tripId);
    rejectTrip(
      { tripId, reason: rejectionReason },
      {
        onSuccess: () => {
          setShowRejectModal(false);
          setRejectionReason('');
          setSelectedTrip(null);
          setActionTripId(null);
        },
        onError: () => {
          setActionTripId(null);
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
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
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

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-900">Unable to load trips</h1>
        <p className="mt-2 text-sm text-red-700">
          {error?.response?.data?.message || error?.message || 'Something went wrong while loading trips.'}
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trips Management</h1>
          <p className="mt-1 text-sm text-gray-500">Approve, reject, and review submitted driver trips.</p>
        </div>
        <div className="rounded-xl bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700">
          {pendingTrips.length} pending approvals
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
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
            onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))}
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stores</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KM</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                        <span className="text-sm">{format(new Date(trip.trip_date), 'MMM d, yyyy')}</span>
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
                        {trip.trip_1?.store_name || trip.store_name_1}
                        {(trip.trip_2?.store_name || trip.store_name_2) ? (
                          <span className="text-gray-500">
                            {' and '}
                            {trip.trip_2?.store_name || trip.store_name_2}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{trip.total_km} km</span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(trip.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setApprovalRemarks(trip.remarks || 'Approved');
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {trip.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(trip.id)}
                              disabled={isApproving && actionTripId === trip.id}
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
                              disabled={isRejecting && actionTripId === trip.id}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTrip && !showRejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white">
            <div className="border-b p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                {selectedTrip.gate_pass_image_url ? (
                  <div>
                    <p className="mb-2 text-sm text-gray-500">Gate Pass</p>
                    <img
                      src={selectedTrip.gate_pass_image_url}
                      alt="Gate Pass"
                      className="h-32 w-full rounded-lg object-cover"
                    />
                  </div>
                ) : null}
                {selectedTrip.map_screenshot_url ? (
                  <div>
                    <p className="mb-2 text-sm text-gray-500">Map Screenshot</p>
                    <img
                      src={selectedTrip.map_screenshot_url}
                      alt="Map Screenshot"
                      className="h-32 w-full rounded-lg object-cover"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">{format(new Date(selectedTrip.trip_date), 'MMM d, yyyy')}</span>
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

              {selectedTrip.trip_1 ? (
                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="mb-2 font-medium">Trip 1</h3>
                  <p className="text-sm text-gray-600">{selectedTrip.trip_1.store_name}</p>
                  <p className="text-sm text-gray-600">{selectedTrip.trip_1.one_way_km} km one-way</p>
                </div>
              ) : null}

              {selectedTrip.trip_2 ? (
                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="mb-2 font-medium">Trip 2</h3>
                  <p className="text-sm text-gray-600">{selectedTrip.trip_2.store_name}</p>
                  <p className="text-sm text-gray-600">{selectedTrip.trip_2.one_way_km} km one-way</p>
                </div>
              ) : null}

              {selectedTrip.status === 'pending' ? (
                <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Approval remarks</span>
                    <textarea
                      rows={3}
                      value={approvalRemarks}
                      onChange={(event) => setApprovalRemarks(event.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                    />
                  </label>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedTrip.id, approvalRemarks)}
                      disabled={isApproving && actionTripId === selectedTrip.id}
                      className="flex-1 rounded-xl bg-green-600 py-3 font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
                    >
                      {isApproving && actionTripId === selectedTrip.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 rounded-xl bg-red-600 py-3 font-medium text-white hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showRejectModal && selectedTrip ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Reject Trip</h2>
            <p className="mb-4 text-gray-600">Please provide a reason for rejecting this trip.</p>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 rounded-xl bg-gray-100 py-3 font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedTrip.id)}
                disabled={isRejecting && actionTripId === selectedTrip.id}
                className="flex-1 rounded-xl bg-red-600 py-3 font-medium text-white hover:bg-red-700 disabled:bg-gray-300"
              >
                {isRejecting && actionTripId === selectedTrip.id ? 'Rejecting...' : 'Reject Trip'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TripsManagement;
