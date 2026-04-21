import { useEffect, useRef, useState } from 'react';
import {
  Calendar, CheckCircle, Eye, Filter, Image, PlusCircle,
  Search, Trash2, Truck, X, XCircle, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useTrips } from '../../hooks/useTrips';
import { useVehicles } from '../../hooks/useVehicles';
import tripService from '../../services/tripService';

const fieldClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

// ─── Store search (same as driver AddTrip) ────────────────────────────────────

const StoreSearch = ({ value, onChange, placeholder, required: isRequired }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await tripService.searchStores(q);
        setResults(res.data?.data || []);
        setOpen(true);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
  };

  const handleInput = (e) => { const v = e.target.value; setQuery(v); onChange(v); search(v); };
  const select = (s) => { setQuery(s.name); onChange(s.name); setOpen(false); setResults([]); };
  const clear = () => { setQuery(''); onChange(''); setResults([]); setOpen(false); };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text" value={query} onChange={handleInput}
          onFocus={() => query && results.length > 0 && setOpen(true)}
          placeholder={placeholder || 'Search store…'} required={isRequired} autoComplete="off"
          className={`${fieldClass} pl-9 pr-9`}
        />
        {query && <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {loading ? <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
            : results.length === 0 ? <div className="px-4 py-3 text-sm text-gray-500">No stores found — type name manually</div>
              : results.map((s) => (
                <button key={s.id} type="button" onClick={() => select(s)}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0">
                  <span className="font-medium text-gray-900">{s.name}</span>
                  {s.area && <span className="ml-2 text-xs text-gray-500">{s.area}</span>}
                </button>
              ))}
        </div>
      )}
    </div>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusBadge = (status) => {
  const cls = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${cls[status] || 'bg-gray-100 text-gray-700'}`}>{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>;
};

// ─── Create / Edit modal ──────────────────────────────────────────────────────

const emptyTripForm = {
  vehicle_id: '',
  trip_date: new Date().toISOString().split('T')[0],
  trip_category: 'regular',
  store_name_1: '', one_way_km_1: '', dispatch_time_1: '',
  store_name_2: '', one_way_km_2: '', dispatch_time_2: '',
  remarks: '',
  gate_pass_image: null,
  map_screenshot: null,
};

const TripFormModal = ({ trip, vehicles, onClose, onSave, isSaving }) => {
  const isEdit = Boolean(trip?.id);
  const [form, setForm] = useState(
    isEdit ? {
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
      gate_pass_image: null,
      map_screenshot: null,
    } : emptyTripForm
  );
  const [showStore2, setShowStore2] = useState(isEdit && Boolean(trip?.trip_2));
  const gatePassRef = useRef(null);
  const mapRef = useRef(null);

  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const primaryDriver = selectedVehicle?.assigned_drivers?.find((d) => d.is_primary);

  const handleFile = (field, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    set(field, file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEdit && !form.vehicle_id) { toast.error('Vehicle is required'); return; }
    if (!form.store_name_1 || !form.one_way_km_1) { toast.error('Store 1 name and KM are required'); return; }
    if (showStore2 && form.store_name_2 && !form.one_way_km_2) { toast.error('Store 2 KM is required'); return; }

    const payload = {
      trip_date: form.trip_date,
      trip_category: form.trip_category,
      store_name_1: form.store_name_1.trim(),
      one_way_km_1: parseFloat(form.one_way_km_1),
      dispatch_time_1: form.dispatch_time_1 || undefined,
      store_name_2: (showStore2 && form.store_name_2.trim()) ? form.store_name_2.trim() : undefined,
      one_way_km_2: (showStore2 && form.one_way_km_2) ? parseFloat(form.one_way_km_2) : undefined,
      dispatch_time_2: (showStore2 && form.dispatch_time_2) ? form.dispatch_time_2 : undefined,
      remarks: form.remarks.trim() || undefined,
    };
    if (!isEdit) {
      payload.vehicle_id = form.vehicle_id;
      if (form.gate_pass_image) payload.gate_pass_image = form.gate_pass_image;
      if (form.map_screenshot) payload.map_screenshot = form.map_screenshot;
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

          {/* Vehicle selector (create only) */}
          {!isEdit && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Vehicle *</label>
              <select required value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} className={fieldClass}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => {
                  const drv = v.assigned_drivers?.find((d) => d.is_primary);
                  return <option key={v.id} value={v.id}>{v.vehicle_number}{drv ? ` — ${drv.name}` : ' — No driver'}</option>;
                })}
              </select>
              {primaryDriver && (
                <p className="mt-1.5 text-xs text-emerald-700 font-medium">Driver: {primaryDriver.name} · {primaryDriver.phone}</p>
              )}
              {form.vehicle_id && !primaryDriver && (
                <p className="mt-1.5 text-xs text-red-600">No driver assigned to this vehicle — assign one first</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Trip date *</label>
              <input type="date" required value={form.trip_date} max={new Date().toISOString().split('T')[0]} onChange={(e) => set('trip_date', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Trip type</label>
              <select value={form.trip_category} onChange={(e) => set('trip_category', e.target.value)} className={fieldClass}>
                <option value="regular">Regular</option>
                <option value="adhoc">Adhoc</option>
              </select>
            </div>
          </div>

          {/* Store 1 */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700">Store 1 (Required)</div>
            <StoreSearch value={form.store_name_1} onChange={(v) => set('store_name_1', v)} placeholder="Search store…" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM *</label>
                <input type="number" required min="0.1" step="0.1" value={form.one_way_km_1} onChange={(e) => set('one_way_km_1', e.target.value)} className={fieldClass} placeholder="26" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time (optional)</label>
                <input type="time" value={form.dispatch_time_1} onChange={(e) => set('dispatch_time_1', e.target.value)} className={fieldClass} />
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
                  <input type="number" min="0.1" step="0.1" value={form.one_way_km_2} onChange={(e) => set('one_way_km_2', e.target.value)} className={fieldClass} placeholder="14" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time (optional)</label>
                  <input type="time" value={form.dispatch_time_2} onChange={(e) => set('dispatch_time_2', e.target.value)} className={fieldClass} />
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowStore2(true)}
              className="w-full rounded-xl border-2 border-dashed border-emerald-200 py-3 text-sm font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition">
              + Add 2nd store
            </button>
          )}

          {/* Remarks */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={`${fieldClass} resize-none`} placeholder="Any notes…" />
          </div>

          {/* Images — create only, optional */}
          {!isEdit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Gate Pass Photo <span className="text-gray-400 font-normal">(optional)</span></label>
                <input ref={gatePassRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile('gate_pass_image', e.target.files?.[0])} />
                <button type="button" onClick={() => gatePassRef.current?.click()}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium transition ${form.gate_pass_image ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-500 hover:border-blue-300 hover:bg-blue-50'}`}>
                  <Image className="h-4 w-4" />
                  {form.gate_pass_image ? form.gate_pass_image.name : 'Upload gate pass'}
                </button>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Map Screenshot <span className="text-gray-400 font-normal">(optional)</span></label>
                <input ref={mapRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile('map_screenshot', e.target.files?.[0])} />
                <button type="button" onClick={() => mapRef.current?.click()}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium transition ${form.map_screenshot ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-500 hover:border-emerald-300 hover:bg-emerald-50'}`}>
                  <Image className="h-4 w-4" />
                  {form.map_screenshot ? form.map_screenshot.name : 'Upload map screenshot'}
                </button>
              </div>
            </div>
          )}

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
  const [lightbox, setLightbox] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={lightbox} alt="Full view" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100"><XCircle className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">

          {/* Images — clickable for full view */}
          {(trip.gate_pass_image_url || trip.map_screenshot_url) && (
            <div className="grid grid-cols-2 gap-4">
              {trip.gate_pass_image_url && (
                <div>
                  <p className="mb-2 text-xs text-gray-500 uppercase">Gate Pass</p>
                  <div className="group relative cursor-pointer overflow-hidden rounded-xl" onClick={() => setLightbox(trip.gate_pass_image_url)}>
                    <img src={trip.gate_pass_image_url} alt="Gate Pass" className="h-36 w-full object-cover transition group-hover:scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                      <Eye className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
                    </div>
                  </div>
                </div>
              )}
              {trip.map_screenshot_url && (
                <div>
                  <p className="mb-2 text-xs text-gray-500 uppercase">Map</p>
                  <div className="group relative cursor-pointer overflow-hidden rounded-xl" onClick={() => setLightbox(trip.map_screenshot_url)}>
                    <img src={trip.map_screenshot_url} alt="Map" className="h-36 w-full object-cover transition group-hover:scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                      <Eye className="h-6 w-6 text-white opacity-0 transition group-hover:opacity-100" />
                    </div>
                  </div>
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
              <div className="font-medium text-blue-900">Store 1: {trip.trip_1.store_name}</div>
              <div className="text-blue-700">{trip.trip_1.one_way_km} km one-way · {trip.trip_1.round_trip_km} km round</div>
              {trip.trip_1.dispatch_time && <div className="text-xs text-blue-600 mt-0.5">Dispatch: {trip.trip_1.dispatch_time}</div>}
            </div>
          )}
          {trip.trip_2 && (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm">
              <div className="font-medium text-emerald-900">Store 2: {trip.trip_2.store_name}</div>
              <div className="text-emerald-700">{trip.trip_2.one_way_km} km one-way · {trip.trip_2.round_trip_km} km round</div>
              {trip.trip_2.dispatch_time && <div className="text-xs text-emerald-600 mt-0.5">Dispatch: {trip.trip_2.dispatch_time}</div>}
            </div>
          )}

          {trip.remarks && (
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Remarks: </span>{trip.remarks}
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
                <button onClick={() => setRejecting(true)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Reject</button>
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
                  onClick={() => { if (!rejectReason.trim()) { toast.error('Reason is required'); return; } onReject(trip.id, rejectReason); }}
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

  const { vehicles } = useVehicles({ is_active: true });

  const displayTrips = filters.status === 'pending' ? pendingTrips : trips;

  const handleApprove = (tripId, remarks) => {
    setActionTripId(tripId);
    approveTrip({ tripId, remarks }, { onSuccess: () => { setViewTrip(null); setActionTripId(null); }, onError: () => setActionTripId(null) });
  };

  const handleReject = (tripId, reason) => {
    setActionTripId(tripId);
    rejectTrip({ tripId, reason }, { onSuccess: () => { setViewTrip(null); setActionTripId(null); }, onError: () => setActionTripId(null) });
  };

  const handleSaveTrip = (payload) => {
    if (editTrip?.id) {
      updateTrip({ tripId: editTrip.id, data: payload }, { onSuccess: () => setEditTrip(null) });
    } else {
      createTrip(payload, { onSuccess: () => setShowForm(false) });
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
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
          <div className="rounded-xl bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700">{pendingTrips.length} pending</div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <PlusCircle className="h-4 w-4" />Add Trip
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
                    <td className="px-4 py-3 text-sm font-medium">{trip.driver_name}</td>
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
