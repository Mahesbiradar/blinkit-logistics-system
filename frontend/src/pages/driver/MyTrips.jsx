import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, CheckCircle, Clock, MapPin, Pencil, Route, Search, Trash2, X, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyTrips } from '../../hooks/useTrips';
import tripService from '../../services/tripService';

// ─── Store search ─────────────────────────────────────────────────────────────

const StoreSearch = ({ value, onChange, placeholder }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const search = (q) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try { const res = await tripService.searchStores(q); setResults(res.data?.data || []); setOpen(true); }
      catch { setResults([]); } finally { setLoading(false); }
    }, 300);
  };

  const handleInput = (e) => { const v = e.target.value; setQuery(v); onChange(v); search(v); };
  const select = (s) => { setQuery(s.name); onChange(s.name); setOpen(false); setResults([]); };
  const clear = () => { setQuery(''); onChange(''); setResults([]); setOpen(false); };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="text" value={query} onChange={handleInput} onFocus={() => query && results.length > 0 && setOpen(true)}
          placeholder={placeholder || 'Search store…'} autoComplete="off"
          className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
        {query && <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-44 overflow-y-auto">
          {loading ? <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
            : results.length === 0 ? <div className="px-4 py-3 text-sm text-gray-500">No stores found — type manually</div>
              : results.map((s) => (
                <button key={s.id} type="button" onClick={() => select(s)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0">
                  <span className="font-medium">{s.name}</span>
                  {s.area && <span className="ml-2 text-xs text-gray-400">{s.area}</span>}
                </button>
              ))}
        </div>
      )}
    </div>
  );
};

// ─── Edit Trip Modal ──────────────────────────────────────────────────────────

const EditTripModal = ({ trip, onClose, onSave, isSaving }) => {
  const hasStore2 = Boolean(trip.trip_2);
  const [showStore2, setShowStore2] = useState(hasStore2);
  const [form, setForm] = useState({
    trip_date: trip.trip_date,
    store_name_1: trip.trip_1?.store_name || '',
    one_way_km_1: trip.trip_1?.one_way_km || '',
    dispatch_time_1: trip.trip_1?.dispatch_time || '',
    store_name_2: trip.trip_2?.store_name || '',
    one_way_km_2: trip.trip_2?.one_way_km || '',
    dispatch_time_2: trip.trip_2?.dispatch_time || '',
    remarks: trip.remarks || '',
  });

  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.store_name_1.trim() || !form.one_way_km_1) {
      toast.error('Store 1 name and KM are required');
      return;
    }
    const payload = {
      trip_date: form.trip_date,
      store_name_1: form.store_name_1.trim(),
      one_way_km_1: parseFloat(form.one_way_km_1),
      dispatch_time_1: form.dispatch_time_1 || undefined,
      remarks: form.remarks.trim() || undefined,
    };
    if (showStore2 && form.store_name_2.trim()) {
      payload.store_name_2 = form.store_name_2.trim();
      payload.one_way_km_2 = form.one_way_km_2 ? parseFloat(form.one_way_km_2) : undefined;
      payload.dispatch_time_2 = form.dispatch_time_2 || undefined;
    } else {
      // Clear store 2 if removed
      payload.store_name_2 = '';
      payload.one_way_km_2 = null;
      payload.dispatch_time_2 = null;
    }
    onSave(payload);
  };

  const fc = 'w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit Trip</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Trip date</label>
            <input type="date" value={form.trip_date} max={new Date().toISOString().split('T')[0]} onChange={(e) => set('trip_date', e.target.value)} className={fc} />
          </div>

          {/* Store 1 */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700">Store 1</div>
            <StoreSearch value={form.store_name_1} onChange={(v) => set('store_name_1', v)} placeholder="Search store…" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM *</label>
                <input type="number" required min="0.1" step="0.1" value={form.one_way_km_1} onChange={(e) => set('one_way_km_1', e.target.value)} className={fc} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time</label>
                <input type="time" value={form.dispatch_time_1} onChange={(e) => set('dispatch_time_1', e.target.value)} className={fc} />
              </div>
            </div>
          </div>

          {/* Store 2 */}
          {showStore2 ? (
            <div className="rounded-xl border border-emerald-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">Store 2 (Optional)</div>
                <button type="button" onClick={() => { setShowStore2(false); set('store_name_2', ''); set('one_way_km_2', ''); set('dispatch_time_2', ''); }}
                  className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
              <StoreSearch value={form.store_name_2} onChange={(v) => set('store_name_2', v)} placeholder="Search store…" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM</label>
                  <input type="number" min="0.1" step="0.1" value={form.one_way_km_2} onChange={(e) => set('one_way_km_2', e.target.value)} className={fc} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time</label>
                  <input type="time" value={form.dispatch_time_2} onChange={(e) => set('dispatch_time_2', e.target.value)} className={fc} />
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowStore2(true)}
              className="w-full rounded-xl border-2 border-dashed border-emerald-200 py-2.5 text-sm font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition">
              + Add 2nd store
            </button>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={`${fc} resize-none`} placeholder="Any notes…" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Status styles ─────────────────────────────────────────────────────────────

const statusStyles = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
};

// ─── Main page ────────────────────────────────────────────────────────────────

const MyTrips = () => {
  const [filters, setFilters] = useState({ status: '', start_date: '', end_date: '' });
  const [editTrip, setEditTrip] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const queryParams = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.start_date ? { start_date: filters.start_date } : {}),
    ...(filters.end_date ? { end_date: filters.end_date } : {}),
  };

  const { myTrips, summary, isLoading, updateTrip, isUpdating, deleteTrip, isDeleting } = useMyTrips(queryParams);

  const cards = useMemo(() => [
    { label: 'Total Trips', value: summary.total_trips || 0, icon: MapPin },
    { label: 'Approved', value: summary.approved_trips || 0, icon: CheckCircle },
    { label: 'Pending', value: summary.pending_trips || 0, icon: Clock },
    { label: 'Total KM', value: `${summary.total_km || 0} km`, icon: Route },
  ], [summary]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editTrip && (
        <EditTripModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSave={(payload) => updateTrip({ tripId: editTrip.id, data: payload }, { onSuccess: () => setEditTrip(null) })}
          isSaving={isUpdating}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete trip?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Trip on <strong>{new Date(confirmDelete.trip_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> will be permanently deleted. This cannot be undone.
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

      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
            <p className="mt-1 text-sm text-gray-500">Pending trips can be edited or deleted before approval.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="date" value={filters.start_date} onChange={(e) => setFilters((c) => ({ ...c, start_date: e.target.value }))}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            <input type="date" value={filters.end_date} onChange={(e) => setFilters((c) => ({ ...c, end_date: e.target.value }))}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            <Link to="/driver/add-trip" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Add trip
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <card.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="mt-1 text-sm text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {myTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No trips found for the selected filter.
          </div>
        ) : (
          myTrips.map((trip) => (
            <div key={trip.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {trip.trip_1?.store_name || 'Trip entry'}
                      {trip.trip_2?.store_name ? ` + ${trip.trip_2.store_name}` : ''}
                    </h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[trip.status] || 'bg-gray-100 text-gray-700'}`}>
                      {trip.status}
                    </span>
                    {trip.trip_category === 'adhoc' && (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">Adhoc</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(trip.trip_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      {trip.total_km} km total
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {trip.vehicle_number || trip.vehicle?.vehicle_number || 'Vehicle not assigned'}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {trip.trip_1 && (
                      <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">Store 1</div>
                        <div className="mt-1">{trip.trip_1.store_name}</div>
                        <div className="text-gray-500">{trip.trip_1.one_way_km} km one-way{trip.trip_1.dispatch_time ? ` · ${trip.trip_1.dispatch_time}` : ''}</div>
                      </div>
                    )}
                    {trip.trip_2 && (
                      <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">Store 2</div>
                        <div className="mt-1">{trip.trip_2.store_name}</div>
                        <div className="text-gray-500">{trip.trip_2.one_way_km} km one-way{trip.trip_2.dispatch_time ? ` · ${trip.trip_2.dispatch_time}` : ''}</div>
                      </div>
                    )}
                  </div>

                  {trip.remarks && (
                    <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Remarks: {trip.remarks}</div>
                  )}
                  {trip.rejection_reason && (
                    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Rejection reason: {trip.rejection_reason}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                  {trip.status === 'approved' && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                      <CheckCircle className="h-4 w-4" />Approved
                    </div>
                  )}
                  {trip.status === 'rejected' && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                      <XCircle className="h-4 w-4" />Rejected
                    </div>
                  )}
                  {trip.status === 'pending' && (
                    <>
                      <div className="inline-flex items-center gap-2 rounded-xl bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700">
                        <Clock className="h-4 w-4" />Awaiting review
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditTrip(trip)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
                          <Pencil className="h-4 w-4" />Edit
                        </button>
                        <button onClick={() => setConfirmDelete(trip)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100">
                          <Trash2 className="h-4 w-4" />Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyTrips;
