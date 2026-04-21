import { useState } from 'react';
import {
  Calendar, CheckCircle, Eye, Filter, PlusCircle,
  Trash2, Truck, User, XCircle, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useTrips } from '../../hooks/useTrips';
import { useDrivers } from '../../hooks/useDrivers';
import { useVehicles } from '../../hooks/useVehicles';

const fieldClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const emptyTripForm = {
  driver_id: '', vehicle_id: '',
  trip_date: new Date().toISOString().split('T')[0],
  trip_category: 'regular',
  store_name_1: '', one_way_km_1: '', dispatch_time_1: '',
  store_name_2: '', one_way_km_2: '', dispatch_time_2: '',
  remarks: '',
};

const statusBadge = (status) => {
  const cls = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${cls[status] || 'bg-gray-100 text-gray-700'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

// ─── Create / Edit form modal ─────────────────────────────────────────────────

const TripFormModal = ({ trip, drivers, vehicles, onClose, onSave, isSaving }) => {
  const isEdit = Boolean(trip?.id);
  const [form, setForm] = useState(
    isEdit
      ? {
          driver_id: trip.driver_id || '',
          vehicle_id: trip.vehicle_id || '',
          trip_date: trip.trip_date,
          trip_category: trip.trip_category || 'regular',
          store_name_1: trip.trip_1?.store_name || trip.store_name_1 || '',
          one_way_km_1: trip.trip_1?.one_way_km || trip.one_way_km_1 || '',
          dispatch_time_1: trip.trip_1?.dispatch_time || trip.dispatch_time_1 || '',
          store_name_2: trip.trip_2?.store_name || trip.store_name_2 || '',
          one_way_km_2: trip.trip_2?.one_way_km || trip.one_way_km_2 || '',
          dispatch_time_2: trip.trip_2?.dispatch_time || trip.dispatch_time_2 || '',
          remarks: trip.remarks || '',
        }
      : emptyTripForm
  );

  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.store_name_1 || !form.one_way_km_1) {
      toast.error('Trip 1 store and KM are required');
      return;
    }
    const payload = {
      trip_date: form.trip_date,
      trip_category: form.trip_category,
      store_name_1: form.store_name_1.trim(),
      one_way_km_1: parseFloat(form.one_way_km_1),
      dispatch_time_1: form.dispatch_time_1 || undefined,
      store_name_2: form.store_name_2.trim() || undefined,
      one_way_km_2: form.one_way_km_2 ? parseFloat(form.one_way_km_2) : undefined,
      dispatch_time_2: form.dispatch_time_2 || undefined,
      remarks: form.remarks.trim() || undefined,
    };
    if (!isEdit) {
      payload.driver_id = form.driver_id;
      payload.vehicle_id = form.vehicle_id;
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Trip' : 'Create Trip'}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isEdit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Driver *</span>
                <select required value={form.driver_id} onChange={(e) => set('driver_id', e.target.value)} className={fieldClass}>
                  <option value="">Select driver</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.user?.first_name} {d.user?.last_name} | {d.user?.phone}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle *</span>
                <select required value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} className={fieldClass}>
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
                </select>
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Trip date *</span>
              <input type="date" required value={form.trip_date} max={new Date().toISOString().split('T')[0]} onChange={(e) => set('trip_date', e.target.value)} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Trip type</span>
              <select value={form.trip_category} onChange={(e) => set('trip_category', e.target.value)} className={fieldClass}>
                <option value="regular">Regular</option>
                <option value="adhoc">Adhoc</option>
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700">Trip 1 (Required)</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Store name *</label>
                <input required value={form.store_name_1} onChange={(e) => set('store_name_1', e.target.value)} className={fieldClass} placeholder="e.g. Tubrahalli" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM *</label>
                <input type="number" required min="0.1" step="0.1" value={form.one_way_km_1} onChange={(e) => set('one_way_km_1', e.target.value)} className={fieldClass} placeholder="26" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time</label>
                <input type="time" value={form.dispatch_time_1} onChange={(e) => set('dispatch_time_1', e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700">Trip 2 (Optional)</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Store name</label>
                <input value={form.store_name_2} onChange={(e) => set('store_name_2', e.target.value)} className={fieldClass} placeholder="e.g. Kothnur" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM</label>
                <input type="number" min="0.1" step="0.1" value={form.one_way_km_2} onChange={(e) => set('one_way_km_2', e.target.value)} className={fieldClass} placeholder="14" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time</label>
                <input type="time" value={form.dispatch_time_2} onChange={(e) => set('dispatch_time_2', e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Remarks</span>
            <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={`${fieldClass} resize-none`} placeholder="Any notes…" />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
              {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Trip Details modal ───────────────────────────────────────────────────────

const TripDetailModal = ({ trip, onClose, onApprove, onReject, isApproving, isRejecting }) => {
  const [remarks, setRemarks] = useState(trip.remarks || 'Approved');
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100"><XCircle className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          {(trip.gate_pass_image_url || trip.map_screenshot_url) && (
            <div className="grid grid-cols-2 gap-4">
              {trip.gate_pass_image_url && (
                <div>
                  <p className="mb-2 text-xs text-gray-500 uppercase">Gate Pass</p>
                  <img src={trip.gate_pass_image_url} alt="Gate Pass" className="h-32 w-full rounded-xl object-cover" />
                </div>
              )}
              {trip.map_screenshot_url && (
                <div>
                  <p className="mb-2 text-xs text-gray-500 uppercase">Map</p>
                  <img src={trip.map_screenshot_url} alt="Map" className="h-32 w-full rounded-xl object-cover" />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Date', format(new Date(trip.trip_date), 'MMM d, yyyy')],
              ['Driver', trip.driver_name],
              ['Vehicle', trip.vehicle_number],
              ['Total KM', `${trip.total_km} km`],
              ['Type', trip.trip_category || 'regular'],
              ['Status', null],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                {val ? <span className="font-medium">{val}</span> : statusBadge(trip.status)}
              </div>
            ))}
          </div>

          {trip.trip_1 && (
            <div className="rounded-xl bg-blue-50 p-3 text-sm">
              <div className="font-medium text-blue-900">Trip 1: {trip.trip_1.store_name}</div>
              <div className="text-blue-700">{trip.trip_1.one_way_km} km one-way</div>
            </div>
          )}
          {trip.trip_2 && (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm">
              <div className="font-medium text-emerald-900">Trip 2: {trip.trip_2.store_name}</div>
              <div className="text-emerald-700">{trip.trip_2.one_way_km} km one-way</div>
            </div>
          )}

          {trip.status === 'pending' && !rejecting && (
            <div className="space-y-3 rounded-xl border border-gray-200 p-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Approval remarks</span>
                <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`${fieldClass} resize-none`} />
              </label>
              <div className="flex gap-3">
                <button onClick={() => onApprove(trip.id, remarks)} disabled={isApproving} className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-300">
                  {isApproving ? 'Approving…' : 'Approve'}
                </button>
                <button onClick={() => setRejecting(true)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                  Reject
                </button>
              </div>
            </div>
          )}

          {rejecting && (
            <div className="space-y-3 rounded-xl border border-red-200 p-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Rejection reason *</span>
                <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why…" className={`${fieldClass} resize-none`} />
              </label>
              <div className="flex gap-3">
                <button onClick={() => setRejecting(false)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700">Back</button>
                <button
                  onClick={() => {
                    if (!rejectReason.trim()) { toast.error('Reason is required'); return; }
                    onReject(trip.id, rejectReason);
                  }}
                  disabled={isRejecting}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-300"
                >
                  {isRejecting ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TripsManagement = () => {
  const [filters, setFilters] = useState({ status: '', start_date: '', end_date: '' });
  const [showForm, setShowForm] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [viewTrip, setViewTrip] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionTripId, setActionTripId] = useState(null);

  const { trips, pendingTrips, isLoading, isError, error, refetch,
    approveTrip, rejectTrip, isApproving, isRejecting,
    createTrip, isCreating, updateTrip, isUpdating, deleteTrip, isDeleting,
  } = useTrips(filters);

  const { drivers } = useDrivers({ is_active: true });
  const { vehicles } = useVehicles({ is_active: true });

  const displayTrips = filters.status === 'pending' ? pendingTrips : trips;

  const handleApprove = (tripId, remarks) => {
    setActionTripId(tripId);
    approveTrip({ tripId, remarks }, {
      onSuccess: () => { setViewTrip(null); setActionTripId(null); },
      onError: () => setActionTripId(null),
    });
  };

  const handleReject = (tripId, reason) => {
    setActionTripId(tripId);
    rejectTrip({ tripId, reason }, {
      onSuccess: () => { setViewTrip(null); setActionTripId(null); },
      onError: () => setActionTripId(null),
    });
  };

  const handleSaveTrip = (payload) => {
    if (editTrip?.id) {
      updateTrip({ tripId: editTrip.id, data: payload }, { onSuccess: () => setEditTrip(null) });
    } else {
      createTrip(payload, { onSuccess: () => setShowForm(false) });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-900">Unable to load trips</h1>
        <p className="mt-2 text-sm text-red-700">{error?.response?.data?.message || error?.message}</p>
        <button onClick={() => refetch()} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(showForm || editTrip) && (
        <TripFormModal
          trip={editTrip}
          drivers={drivers}
          vehicles={vehicles}
          onClose={() => { setShowForm(false); setEditTrip(null); }}
          onSave={handleSaveTrip}
          isSaving={isCreating || isUpdating}
        />
      )}

      {viewTrip && (
        <TripDetailModal
          trip={viewTrip}
          onClose={() => setViewTrip(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          isApproving={isApproving && actionTripId === viewTrip.id}
          isRejecting={isRejecting && actionTripId === viewTrip.id}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete trip?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Trip on <strong>{format(new Date(confirmDelete.trip_date), 'MMM d, yyyy')}</strong> by <strong>{confirmDelete.driver_name}</strong> will be permanently deleted.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
              <button
                disabled={isDeleting}
                onClick={() => deleteTrip(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-300"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trips Management</h1>
          <p className="mt-1 text-sm text-gray-500">Approve, reject, and manage driver trips.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700">
            {pendingTrips.length} pending
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            Add Trip
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
          </div>
          <select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input type="date" value={filters.start_date} onChange={(e) => setFilters((c) => ({ ...c, start_date: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={filters.end_date} onChange={(e) => setFilters((c) => ({ ...c, end_date: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => setFilters({ status: '', start_date: '', end_date: '' })} className="text-sm text-blue-600 hover:underline">Clear</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                {['Date', 'Driver', 'Vehicle', 'Stores', 'KM', 'Type', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayTrips.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No trips found</td></tr>
              ) : (
                displayTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{format(new Date(trip.trip_date), 'MMM d, yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{trip.driver_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{trip.vehicle_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[180px] truncate">
                      {trip.trip_1?.store_name || trip.store_name_1}
                      {(trip.trip_2?.store_name || trip.store_name_2) ? ` + ${trip.trip_2?.store_name || trip.store_name_2}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{trip.total_km} km</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${trip.trip_category === 'adhoc' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                        {trip.trip_category || 'regular'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(trip.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewTrip(trip)} className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditTrip(trip)} className="rounded-lg p-1.5 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {trip.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(trip.id, 'Approved')} disabled={isApproving && actionTripId === trip.id} className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600" title="Approve">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => setViewTrip(trip)} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Reject">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => setConfirmDelete(trip)} className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TripsManagement;
