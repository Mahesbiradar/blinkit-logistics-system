import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Calendar, CalendarCheck, ChevronDown, ChevronUp,
  Edit2, Image, MapPin, Pencil, PlusCircle, Search,
  Trash2, Truck, User, Wallet, X,
} from 'lucide-react';
import vehicleService from '../../services/vehicleService';
import tripService from '../../services/tripService';
import expenseService from '../../services/expenseService';
import { useCreateTrip } from '../../hooks/useTrips';
import { useExpenseActions } from '../../hooks/useExpenses';
import { useDrivers } from '../../hooks/useDrivers';

const fieldClass =
  'w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const VEHICLE_TYPES = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'three_wheeler', label: '3-Wheeler' },
  { value: 'bike', label: 'Bike' },
  { value: 'other', label: 'Other' },
];

const getMonthDefaults = () => {
  const today = new Date();
  return {
    start_date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    end_date: today.toISOString().split('T')[0],
  };
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const statusBadge = (s) => {
  const cls = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${cls[s] || 'bg-gray-100 text-gray-700'}`}>
      {s?.charAt(0).toUpperCase() + s?.slice(1)}
    </span>
  );
};

const expenseColor = {
  fuel: 'bg-orange-100 text-orange-700',
  toll: 'bg-blue-100 text-blue-700',
  advance: 'bg-purple-100 text-purple-700',
  allowance: 'bg-teal-100 text-teal-700',
  maintenance: 'bg-red-100 text-red-700',
  company_management: 'bg-gray-100 text-gray-700',
  other: 'bg-gray-100 text-gray-700',
};

// ─── Store search ─────────────────────────────────────────────────────────────

const StoreSearch = ({ value, onChange, placeholder, required: isReq }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  const search = (q) => {
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await tripService.searchStores(q);
        setResults(res.data?.data || []);
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
  };

  const handleInput = (e) => { setQuery(e.target.value); onChange(e.target.value); search(e.target.value); };
  const select = (s) => { setQuery(s.name); onChange(s.name); setOpen(false); };
  const clear = () => { setQuery(''); onChange(''); setResults([]); setOpen(false); };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={handleInput} onFocus={() => query && results.length && setOpen(true)}
          placeholder={placeholder || 'Search store…'} required={isReq} autoComplete="off"
          className={`${fieldClass} pl-9 pr-9`} />
        {query && <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {results.length === 0
            ? <div className="px-4 py-3 text-sm text-gray-500">No stores found — type manually</div>
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

// ─── Vehicle Settings Modal ───────────────────────────────────────────────────

const VehicleSettingsModal = ({ vehicle, vehicleId, onClose }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { drivers } = useDrivers({ is_active: true });
  const isOwner = vehicle.owner_type === 'owner';
  const primaryDriver = (vehicle.assigned_drivers || []).find((d) => d.is_primary);
  const [tab, setTab] = useState('vehicle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignDriverId, setAssignDriverId] = useState('');
  const [vForm, setVForm] = useState({ vehicle_number: vehicle.vehicle_number, vehicle_type: vehicle.vehicle_type });
  const [dForm, setDForm] = useState({
    first_name: primaryDriver?.name?.split(' ')[0] || '',
    last_name: primaryDriver?.name?.split(' ').slice(1).join(' ') || '',
    phone: '', password: '',
  });

  const setV = (f, v) => setVForm((c) => ({ ...c, [f]: v }));
  const setD = (f, v) => setDForm((c) => ({ ...c, [f]: v }));

  const invalidate = () => {
    queryClient.invalidateQueries(['vehicle', vehicleId]);
    queryClient.invalidateQueries(['vehicles']);
  };

  const updateMutation = useMutation(
    ({ vId, data }) => vehicleService.updateVehicle(vId, data),
    { onSuccess: () => { toast.success('Vehicle updated'); invalidate(); onClose(); }, onError: (err) => toast.error(err.response?.data?.message || 'Failed') }
  );
  const deleteMutation = useMutation(
    (vId) => vehicleService.deleteVehicle(vId),
    { onSuccess: () => { toast.success('Vehicle deleted'); queryClient.invalidateQueries(['vehicles']); navigate('/admin/vehicles'); }, onError: (err) => toast.error(err.response?.data?.message || 'Failed') }
  );
  const updateDriverMutation = useMutation(
    ({ vId, data }) => vehicleService.updateDriverLogin(vId, data),
    { onSuccess: () => { toast.success('Driver login updated'); invalidate(); onClose(); }, onError: (err) => toast.error(err.response?.data?.message || 'Failed') }
  );
  const createDriverMutation = useMutation(
    ({ vId, data }) => vehicleService.createDriver(vId, data),
    { onSuccess: () => { toast.success('Driver created'); invalidate(); onClose(); }, onError: (err) => toast.error(err.response?.data?.message || 'Failed') }
  );
  const assignDriverMutation = useMutation(
    ({ vId, data }) => vehicleService.assignDriver(vId, data),
    { onSuccess: () => { toast.success('Driver assigned'); invalidate(); onClose(); }, onError: (err) => toast.error(err.response?.data?.message || 'Failed') }
  );

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    updateMutation.mutate({ vId: vehicle.id, data: { vehicle_number: vForm.vehicle_number.trim().toUpperCase(), vehicle_type: vForm.vehicle_type } });
  };
  const handleSaveDriverLogin = (e) => {
    e.preventDefault();
    const payload = {};
    if (dForm.first_name) payload.first_name = dForm.first_name;
    if (dForm.last_name) payload.last_name = dForm.last_name;
    if (dForm.phone) payload.phone = dForm.phone;
    if (dForm.password) payload.password = dForm.password;
    updateDriverMutation.mutate({ vId: vehicle.id, data: payload });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{vehicle.vehicle_number} Settings</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm capitalize text-gray-500">{vehicle.vehicle_type}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{isOwner ? 'Owner' : 'Vendor'}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="flex border-b border-gray-100">
          {['vehicle', 'driver'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-semibold transition ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>
              {t === 'vehicle' ? 'Vehicle Details' : 'Driver Settings'}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === 'vehicle' && (confirmDelete ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                This will permanently delete <strong>{vehicle.vehicle_number}</strong>. Trips and expenses will remain.
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700">Cancel</button>
                <button disabled={deleteMutation.isLoading} onClick={() => deleteMutation.mutate(vehicle.id)} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
                  {deleteMutation.isLoading ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveVehicle} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle number</span>
                <input required value={vForm.vehicle_number} onChange={(e) => setV('vehicle_number', e.target.value.toUpperCase())} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle type</span>
                <select value={vForm.vehicle_type} onChange={(e) => setV('vehicle_type', e.target.value)} className={fieldClass}>
                  {VEHICLE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Vehicle status</div>
                  <div className="text-xs text-gray-500">Inactive vehicles won't appear in trip creation</div>
                </div>
                <button type="button" onClick={() => updateMutation.mutate({ vId: vehicle.id, data: { is_active: !vehicle.is_active } })} disabled={updateMutation.isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${vehicle.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${vehicle.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100">Delete Vehicle</button>
                <div className="flex gap-3">
                  <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
                  <button type="submit" disabled={updateMutation.isLoading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
                    {updateMutation.isLoading ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          ))}
          {tab === 'driver' && (
            <div className="space-y-6">
              {primaryDriver ? (
                <>
                  <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Current driver: <strong>{primaryDriver.name}</strong> · {primaryDriver.phone || 'Phone not set'}</div>
                  <form onSubmit={handleSaveDriverLogin} className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">Update driver login details</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[['first_name', 'First name'], ['last_name', 'Last name']].map(([f, label]) => (
                        <label key={f} className="block">
                          <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
                          <input value={dForm[f]} onChange={(e) => setD(f, e.target.value)} className={fieldClass} />
                        </label>
                      ))}
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">New phone</span>
                        <input value={dForm.phone} onChange={(e) => setD('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={fieldClass} placeholder={primaryDriver.phone || 'Leave blank to keep'} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">New password</span>
                        <input type="password" value={dForm.password} onChange={(e) => setD('password', e.target.value)} className={fieldClass} placeholder="Leave blank to keep" />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={updateDriverMutation.isLoading} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-300">
                        {updateDriverMutation.isLoading ? 'Saving…' : 'Update Login'}
                      </button>
                    </div>
                  </form>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Or assign a different driver</div>
                    <form onSubmit={(e) => { e.preventDefault(); assignDriverMutation.mutate({ vId: vehicle.id, data: { driver_id: assignDriverId, is_primary: true } }); }} className="flex gap-3">
                      <select required value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)} className={`flex-1 ${fieldClass}`}>
                        <option value="">Select driver</option>
                        {drivers.map((d) => <option key={d.id} value={d.id}>{d.user?.first_name} {d.user?.last_name} | {d.user?.phone}</option>)}
                      </select>
                      <button type="submit" disabled={assignDriverMutation.isLoading} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:bg-gray-300">{assignDriverMutation.isLoading ? '…' : 'Assign'}</button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">No driver assigned yet.</div>
                  <form onSubmit={(e) => { e.preventDefault(); createDriverMutation.mutate({ vId: vehicle.id, data: dForm }); }} className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">Create new driver login</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">First name *</span><input required value={dForm.first_name} onChange={(e) => setD('first_name', e.target.value)} className={fieldClass} /></label>
                      <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Last name</span><input value={dForm.last_name} onChange={(e) => setD('last_name', e.target.value)} className={fieldClass} /></label>
                      <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Phone *</span><input required value={dForm.phone} onChange={(e) => setD('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={fieldClass} placeholder="10-digit number" /></label>
                      <label className="block"><span className="mb-1 block text-xs font-medium text-gray-600">Password *</span><input required type="password" value={dForm.password} onChange={(e) => setD('password', e.target.value)} className={fieldClass} /></label>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={createDriverMutation.isLoading} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-300">{createDriverMutation.isLoading ? 'Creating…' : 'Create Driver'}</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Edit Trip Modal ──────────────────────────────────────────────────────────

const EditTripModal = ({ trip, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState({
    trip_date: trip.trip_date,
    trip_category: trip.trip_category || 'regular',
    store_name_1: trip.trip_1?.store_name || '',
    one_way_km_1: trip.trip_1?.one_way_km || '',
    dispatch_time_1: trip.trip_1?.dispatch_time || '',
    store_name_2: trip.trip_2?.store_name || '',
    one_way_km_2: trip.trip_2?.one_way_km || '',
    dispatch_time_2: trip.trip_2?.dispatch_time || '',
    remarks: trip.remarks || '',
  });
  const [showStore2, setShowStore2] = useState(Boolean(trip.trip_2));
  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.store_name_1 || !form.one_way_km_1) { toast.error('Store 1 and KM required'); return; }
    onSave({
      trip_date: form.trip_date,
      trip_category: form.trip_category,
      store_name_1: form.store_name_1.trim(),
      one_way_km_1: parseFloat(form.one_way_km_1),
      dispatch_time_1: form.dispatch_time_1 || undefined,
      store_name_2: showStore2 && form.store_name_2 ? form.store_name_2.trim() : undefined,
      one_way_km_2: showStore2 && form.one_way_km_2 ? parseFloat(form.one_way_km_2) : undefined,
      dispatch_time_2: showStore2 && form.dispatch_time_2 ? form.dispatch_time_2 : undefined,
      remarks: form.remarks.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit Trip</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700">Store 1</div>
            <StoreSearch value={form.store_name_1} onChange={(v) => set('store_name_1', v)} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM *</label>
                <input type="number" required min="0.1" step="0.1" value={form.one_way_km_1} onChange={(e) => set('one_way_km_1', e.target.value)} className={fieldClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time</label>
                <input type="time" value={form.dispatch_time_1} onChange={(e) => set('dispatch_time_1', e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>
          {showStore2 ? (
            <div className="rounded-xl border border-emerald-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">Store 2</div>
                <button type="button" onClick={() => { setShowStore2(false); set('store_name_2', ''); set('one_way_km_2', ''); }} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
              <StoreSearch value={form.store_name_2} onChange={(v) => set('store_name_2', v)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM</label>
                  <input type="number" min="0.1" step="0.1" value={form.one_way_km_2} onChange={(e) => set('one_way_km_2', e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time</label>
                  <input type="time" value={form.dispatch_time_2} onChange={(e) => set('dispatch_time_2', e.target.value)} className={fieldClass} />
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowStore2(true)} className="w-full rounded-xl border-2 border-dashed border-emerald-200 py-3 text-sm font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition">
              + Add 2nd store
            </button>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={`${fieldClass} resize-none`} placeholder="Any notes…" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
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

// ─── Edit Expense Modal ───────────────────────────────────────────────────────

const EditExpenseModal = ({ expense, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState({
    expense_type: expense.expense_type || 'fuel',
    amount: expense.amount || '',
    expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
    description: expense.description || '',
    payment_mode: expense.payment_mode || 'cash',
  });
  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit Expense</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="p-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Expense type</span>
            <select value={form.expense_type} onChange={(e) => set('expense_type', e.target.value)} className={fieldClass}>
              <option value="fuel">Fuel</option>
              <option value="toll">Toll</option>
              <option value="advance">Advance</option>
              <option value="allowance">Allowance</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
              <option value="company_management">Company / Management</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Amount (Rs.) *</span>
              <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Date *</span>
              <input type="date" required value={form.expense_date} max={new Date().toISOString().split('T')[0]} onChange={(e) => set('expense_date', e.target.value)} className={fieldClass} />
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Payment mode</span>
            <select value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)} className={fieldClass}>
              <option value="cash">Cash</option>
              <option value="phonepay">PhonePe</option>
              <option value="gpay">Google Pay</option>
              <option value="paytm">Paytm</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Description</span>
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} className={`${fieldClass} resize-none`} placeholder="Optional notes…" />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300">
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Add Trip modal ───────────────────────────────────────────────────────────

const AddTripModal = ({ vehicle, onClose, onSave, isSaving }) => {
  const primaryDriver = vehicle.assigned_drivers?.find((d) => d.is_primary);
  const [form, setForm] = useState({
    trip_date: new Date().toISOString().split('T')[0],
    trip_category: 'regular',
    store_name_1: '', one_way_km_1: '', dispatch_time_1: '',
    store_name_2: '', one_way_km_2: '', dispatch_time_2: '',
    remarks: '',
    gate_pass_image: null, map_screenshot: null,
    gate_pass_image_2: null, map_screenshot_2: null,
  });
  const [showStore2, setShowStore2] = useState(false);
  const gp1Ref = useRef(null); const map1Ref = useRef(null);
  const gp2Ref = useRef(null); const map2Ref = useRef(null);
  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  const handleFile = (field, file) => {
    if (file && file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    set(field, file || null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.store_name_1 || !form.one_way_km_1) { toast.error('Store 1 name and KM are required'); return; }
    const payload = {
      vehicle_id: vehicle.id,
      trip_date: form.trip_date,
      trip_category: form.trip_category,
      store_name_1: form.store_name_1.trim(),
      one_way_km_1: parseFloat(form.one_way_km_1),
      dispatch_time_1: form.dispatch_time_1 || undefined,
      store_name_2: showStore2 && form.store_name_2 ? form.store_name_2.trim() : undefined,
      one_way_km_2: showStore2 && form.one_way_km_2 ? parseFloat(form.one_way_km_2) : undefined,
      dispatch_time_2: showStore2 && form.dispatch_time_2 ? form.dispatch_time_2 : undefined,
      remarks: form.remarks.trim() || undefined,
    };
    if (form.gate_pass_image) payload.gate_pass_image = form.gate_pass_image;
    if (form.map_screenshot) payload.map_screenshot = form.map_screenshot;
    if (showStore2 && form.gate_pass_image_2) payload.gate_pass_image_2 = form.gate_pass_image_2;
    if (showStore2 && form.map_screenshot_2) payload.map_screenshot_2 = form.map_screenshot_2;
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Trip</h2>
            <p className="text-xs text-gray-500 mt-0.5">Vehicle: <strong>{vehicle.vehicle_number}</strong>{primaryDriver && <> · Driver: <strong>{primaryDriver.name}</strong></>}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700">Store 1 (Required)</div>
            <StoreSearch value={form.store_name_1} onChange={(v) => set('store_name_1', v)} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM *</label>
                <input type="number" required min="0.1" step="0.1" value={form.one_way_km_1} onChange={(e) => set('one_way_km_1', e.target.value)} className={fieldClass} placeholder="e.g. 26" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time (optional)</label>
                <input type="time" value={form.dispatch_time_1} onChange={(e) => set('dispatch_time_1', e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>
          {showStore2 ? (
            <div className="rounded-xl border border-emerald-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">Store 2 (Optional)</div>
                <button type="button" onClick={() => { setShowStore2(false); set('store_name_2', ''); set('one_way_km_2', ''); }} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
              <StoreSearch value={form.store_name_2} onChange={(v) => set('store_name_2', v)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">One-way KM</label>
                  <input type="number" min="0.1" step="0.1" value={form.one_way_km_2} onChange={(e) => set('one_way_km_2', e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Dispatch time</label>
                  <input type="time" value={form.dispatch_time_2} onChange={(e) => set('dispatch_time_2', e.target.value)} className={fieldClass} />
                </div>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowStore2(true)} className="w-full rounded-xl border-2 border-dashed border-emerald-200 py-3 text-sm font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition">
              + Add 2nd store
            </button>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { ref: gp1Ref, field: 'gate_pass_image', label: 'Gate Pass 1' },
              { ref: map1Ref, field: 'map_screenshot', label: 'Map Screenshot 1' },
              ...(showStore2 ? [
                { ref: gp2Ref, field: 'gate_pass_image_2', label: 'Gate Pass 2' },
                { ref: map2Ref, field: 'map_screenshot_2', label: 'Map Screenshot 2' },
              ] : []),
            ].map(({ ref, field, label }) => (
              <div key={field}>
                <label className="mb-2 block text-sm font-medium text-gray-700">{label} <span className="text-gray-400 font-normal">(optional)</span></label>
                <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(field, e.target.files?.[0])} />
                <button type="button" onClick={() => ref.current?.click()}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium transition ${form[field] ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-500 hover:border-blue-300 hover:bg-blue-50'}`}>
                  <Image className="h-4 w-4" />
                  {form[field] ? form[field].name : `Upload ${label.toLowerCase()}`}
                </button>
              </div>
            ))}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Remarks</label>
            <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={`${fieldClass} resize-none`} placeholder="Any notes…" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
              {isSaving ? 'Saving…' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Add Expense modal ────────────────────────────────────────────────────────

const AddExpenseModal = ({ vehicle, onClose, onSave, isSaving }) => {
  const primaryDriver = vehicle.assigned_drivers?.find((d) => d.is_primary);
  const [form, setForm] = useState({
    expense_type: 'fuel', amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '', payment_mode: 'cash', receipt_image: null,
  });
  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
            <p className="text-xs text-gray-500 mt-0.5">Vehicle: <strong>{vehicle.vehicle_number}</strong>{primaryDriver && <> · Driver: <strong>{primaryDriver.name}</strong></>}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ vehicle_id: vehicle.id, driver_id: primaryDriver?.id, ...form }); }} className="p-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Expense type</span>
            <select value={form.expense_type} onChange={(e) => set('expense_type', e.target.value)} className={fieldClass}>
              <option value="fuel">Fuel</option>
              <option value="toll">Toll</option>
              <option value="advance">Advance</option>
              <option value="allowance">Allowance</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
              <option value="company_management">Company / Management</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Amount (Rs.) *</span>
              <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={fieldClass} placeholder="0.00" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Date *</span>
              <input type="date" required value={form.expense_date} max={new Date().toISOString().split('T')[0]} onChange={(e) => set('expense_date', e.target.value)} className={fieldClass} />
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Payment mode</span>
            <select value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)} className={fieldClass}>
              <option value="cash">Cash</option>
              <option value="phonepay">PhonePe</option>
              <option value="gpay">Google Pay</option>
              <option value="paytm">Paytm</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Receipt image</span>
            <input type="file" accept="image/*" onChange={(e) => set('receipt_image', e.target.files?.[0] || null)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Description</span>
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} className={`${fieldClass} resize-none`} placeholder="Optional notes…" />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300">
              {isSaving ? 'Saving…' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const VehicleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tripFilter, setTripFilter] = useState({ status: '', ...getMonthDefaults() });
  const [expenseFilter, setExpenseFilter] = useState({ expense_type: '' });
  const [activeTab, setActiveTab] = useState('trips');

  // Trip interactions
  const [expandedTripId, setExpandedTripId] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const [deleteTripId, setDeleteTripId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Expense interactions
  const [editExpense, setEditExpense] = useState(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState(null);

  const { data: vehicleRes, isLoading: vehicleLoading, isError: vehicleError } = useQuery(
    ['vehicle', id],
    () => vehicleService.getVehicle(id),
    { enabled: Boolean(id) }
  );
  const vehicle = vehicleRes?.data?.data;

  const { data: tripsRes, isLoading: tripsLoading, refetch: refetchTrips } = useQuery(
    ['vehicleTrips', id, tripFilter],
    () => tripService.getTrips({ vehicle_id: id, ...tripFilter }),
    { enabled: Boolean(id) }
  );
  const trips = tripsRes?.data?.data?.trips || [];

  const { data: expensesRes, isLoading: expensesLoading, refetch: refetchExpenses } = useQuery(
    ['vehicleExpenses', id, expenseFilter],
    () => expenseService.getExpenses({ vehicle_id: id, ...expenseFilter }),
    { enabled: Boolean(id) }
  );
  const expenses = expensesRes?.data?.data?.expenses || [];

  const { createTrip, isCreating: isCreatingTrip } = useCreateTrip();
  const { createExpense, isCreating: isCreatingExpense, updateExpense, isUpdating: isUpdatingExpense, deleteExpense, isDeleting: isDeletingExpense } = useExpenseActions();

  const updateTripMutation = useMutation(
    ({ tripId, data }) => tripService.updateTrip(tripId, data),
    {
      onSuccess: () => { toast.success('Trip updated'); setEditTrip(null); refetchTrips(); queryClient.invalidateQueries(['trips']); },
      onError: (err) => toast.error(err.response?.data?.message || 'Failed to update trip'),
    }
  );
  const deleteTripMutation = useMutation(
    (tripId) => tripService.deleteTrip(tripId),
    {
      onSuccess: () => { toast.success('Trip deleted'); setDeleteTripId(null); refetchTrips(); queryClient.invalidateQueries(['trips']); },
      onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete trip'),
    }
  );

  if (vehicleLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }
  if (vehicleError || !vehicle) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700 font-medium">Vehicle not found.</p>
        <button onClick={() => navigate('/admin/vehicles')} className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">Back to Vehicles</button>
      </div>
    );
  }

  const isOwner = vehicle.owner_type === 'owner';
  const primaryDriver = (vehicle.assigned_drivers || []).find((d) => d.is_primary);
  const allDrivers = vehicle.assigned_drivers || [];

  const totalTripKm = trips.reduce((s, t) => s + parseFloat(t.total_km || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const pendingTrips = trips.filter((t) => t.status === 'pending').length;
  const attendedDays = new Set(trips.map((t) => t.trip_date)).size;

  const handleAddTrip = (payload) => createTrip(payload, { onSuccess: () => { setShowAddTrip(false); refetchTrips(); } });
  const handleAddExpense = (payload) => createExpense(payload, { onSuccess: () => { setShowAddExpense(false); refetchExpenses(); } });

  return (
    <div className="space-y-6">
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightboxUrl(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setLightboxUrl(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxUrl} alt="Full view" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Modals */}
      {showSettings && <VehicleSettingsModal vehicle={vehicle} vehicleId={id} onClose={() => setShowSettings(false)} />}
      {showAddTrip && <AddTripModal vehicle={vehicle} onClose={() => setShowAddTrip(false)} onSave={handleAddTrip} isSaving={isCreatingTrip} />}
      {showAddExpense && <AddExpenseModal vehicle={vehicle} onClose={() => setShowAddExpense(false)} onSave={handleAddExpense} isSaving={isCreatingExpense} />}
      {editTrip && (
        <EditTripModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSave={(data) => updateTripMutation.mutate({ tripId: editTrip.id, data })}
          isSaving={updateTripMutation.isLoading}
        />
      )}
      {editExpense && (
        <EditExpenseModal
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSave={(data) => updateExpense({ expenseId: editExpense.id, data }, { onSuccess: () => { setEditExpense(null); refetchExpenses(); } })}
          isSaving={isUpdatingExpense}
        />
      )}

      {/* Delete trip confirm */}
      {deleteTripId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete trip?</h3>
            <p className="mt-2 text-sm text-gray-500">This trip will be permanently deleted.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteTripId(null)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button onClick={() => deleteTripMutation.mutate(deleteTripId)} disabled={deleteTripMutation.isLoading} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
                {deleteTripMutation.isLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete expense confirm */}
      {deleteExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete expense?</h3>
            <p className="mt-2 text-sm text-gray-500">This expense will be permanently deleted.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteExpenseId(null)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button onClick={() => deleteExpense(deleteExpenseId, { onSuccess: () => { setDeleteExpenseId(null); refetchExpenses(); } })} disabled={isDeletingExpense} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
                {isDeletingExpense ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/admin/vehicles')} className="mt-1 rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{vehicle.vehicle_number}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{isOwner ? 'Owner' : 'Vendor'}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${vehicle.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{vehicle.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <p className="mt-1 text-sm capitalize text-gray-500">{vehicle.vehicle_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setShowAddExpense(true)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition">
            <Wallet className="h-4 w-4" /> Add Expense
          </button>
          <button onClick={() => setShowAddTrip(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
            <PlusCircle className="h-4 w-4" /> Add Trip
          </button>
          <button onClick={() => setShowSettings(true)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            <Edit2 className="h-4 w-4" /> Settings
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3"><User className="h-3.5 w-3.5" /> Driver</div>
          {primaryDriver ? (
            <><div className="text-base font-bold text-gray-900">{primaryDriver.name}</div><div className="text-sm text-gray-500 mt-0.5">{primaryDriver.phone || 'No phone'}</div></>
          ) : <div className="text-sm text-gray-400 italic">No driver assigned</div>}
          {allDrivers.length > 1 && <div className="mt-2 text-xs text-gray-400">{allDrivers.length - 1} other driver(s)</div>}
        </div>
        <div className="rounded-2xl border border-blue-50 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3"><MapPin className="h-3.5 w-3.5" /> Trips</div>
          <div className="text-3xl font-bold text-gray-900">{trips.length}</div>
          {pendingTrips > 0 && <div className="mt-1 text-xs text-yellow-600">{pendingTrips} pending approval</div>}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3"><Truck className="h-3.5 w-3.5" /> Total KM</div>
          <div className="text-3xl font-bold text-gray-900">{totalTripKm.toFixed(1)}</div>
          <div className="mt-1 text-xs text-gray-400">across filtered trips</div>
        </div>
        <div className="rounded-2xl border border-emerald-50 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3"><CalendarCheck className="h-3.5 w-3.5" /> Attended Days</div>
          <div className="text-3xl font-bold text-gray-900">{attendedDays}</div>
          <div className="mt-1 text-xs text-gray-400">days with trips in range</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ key: 'trips', label: `Trips (${trips.length})`, icon: MapPin }, { key: 'expenses', label: `Expenses (${expenses.length})`, icon: Wallet }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Trips tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <select value={tripFilter.status} onChange={(e) => setTripFilter((c) => ({ ...c, status: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="date" value={tripFilter.start_date} onChange={(e) => setTripFilter((c) => ({ ...c, start_date: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={tripFilter.end_date} onChange={(e) => setTripFilter((c) => ({ ...c, end_date: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => setTripFilter({ status: '', ...getMonthDefaults() })} className="text-sm text-blue-600 hover:underline">Reset</button>
          </div>

          {tripsLoading ? (
            <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <MapPin className="mx-auto h-8 w-8 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No trips found for this vehicle.</p>
              <button onClick={() => setShowAddTrip(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <PlusCircle className="h-4 w-4" /> Add First Trip
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      {['Date', 'Driver', 'Stores', 'Total KM', 'Type', 'Status', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trips.map((trip) => (
                      <>
                        <tr
                          key={trip.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedTripId(expandedTripId === trip.id ? null : trip.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{format(new Date(trip.trip_date), 'MMM d, yyyy')}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{trip.driver_name}</td>
                          <td className="px-4 py-3 text-sm max-w-[200px] truncate">
                            {trip.trip_1?.store_name || trip.store_name_1 || '—'}
                            {(trip.trip_2?.store_name || trip.store_name_2) ? ` + ${trip.trip_2?.store_name || trip.store_name_2}` : ''}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">{trip.total_km} km</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${trip.trip_category === 'adhoc' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                              {trip.trip_category || 'regular'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{statusBadge(trip.status)}</td>
                          <td className="px-4 py-3 text-right">
                            {expandedTripId === trip.id
                              ? <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
                              : <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />}
                          </td>
                        </tr>

                        {expandedTripId === trip.id && (
                          <tr key={`${trip.id}-expanded`} className="bg-gray-50">
                            <td colSpan={7} className="px-6 pb-4 pt-1">
                              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                                {/* Store details */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {trip.trip_1 && (
                                    <div className="rounded-lg bg-blue-50 p-3 text-sm">
                                      <div className="font-semibold text-blue-900">Store 1: {trip.trip_1.store_name}</div>
                                      <div className="mt-0.5 text-xs text-blue-700">
                                        {trip.trip_1.one_way_km} km one-way · {trip.trip_1.round_trip_km} km round
                                        {trip.trip_1.dispatch_time && ` · Dispatch: ${trip.trip_1.dispatch_time}`}
                                      </div>
                                    </div>
                                  )}
                                  {trip.trip_2 && (
                                    <div className="rounded-lg bg-emerald-50 p-3 text-sm">
                                      <div className="font-semibold text-emerald-900">Store 2: {trip.trip_2.store_name}</div>
                                      <div className="mt-0.5 text-xs text-emerald-700">
                                        {trip.trip_2.one_way_km} km one-way · {trip.trip_2.round_trip_km} km round
                                        {trip.trip_2.dispatch_time && ` · Dispatch: ${trip.trip_2.dispatch_time}`}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Remarks */}
                                {trip.remarks && (
                                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm">
                                    <span className="font-medium text-amber-800">Remarks: </span>
                                    <span className="text-amber-700">{trip.remarks}</span>
                                  </div>
                                )}

                                {/* Image thumbnails */}
                                {(trip.gate_pass_image_url || trip.map_screenshot_url || trip.gate_pass_image_2_url || trip.map_screenshot_2_url) && (
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      { url: trip.gate_pass_image_url, label: 'Gate Pass' },
                                      { url: trip.map_screenshot_url, label: 'Map 1' },
                                      { url: trip.gate_pass_image_2_url, label: 'Gate Pass 2' },
                                      { url: trip.map_screenshot_2_url, label: 'Map 2' },
                                    ].filter(i => i.url).map(({ url, label }) => (
                                      <div key={label} className="cursor-pointer" onClick={() => setLightboxUrl(url)}>
                                        <img src={url} alt={label} className="h-16 w-16 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition" />
                                        <div className="mt-0.5 text-center text-xs text-gray-400">{label}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* CRUD actions */}
                                <div className="flex gap-2 pt-1 border-t border-gray-100">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditTrip(trip); }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                                  >
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteTripId(trip.id); }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Expenses tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {expenses.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {Object.entries(
                expenses.reduce((acc, e) => { acc[e.expense_type] = (acc[e.expense_type] || 0) + parseFloat(e.amount || 0); return acc; }, {})
              ).map(([type, amt]) => (
                <div key={type} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${expenseColor[type] || 'bg-gray-100 text-gray-700'}`}>{type}</div>
                  <div className="text-lg font-bold text-gray-900">Rs. {Number(amt).toLocaleString('en-IN')}</div>
                </div>
              ))}
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:col-span-3 xl:col-span-1">
                <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Total</div>
                <div className="text-lg font-bold text-gray-900">Rs. {Number(totalExpenses).toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <select value={expenseFilter.expense_type} onChange={(e) => setExpenseFilter({ expense_type: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              <option value="fuel">Fuel</option>
              <option value="toll">Toll</option>
              <option value="advance">Advance</option>
              <option value="allowance">Allowance</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
              <option value="company_management">Company / Management</option>
            </select>
            {expenseFilter.expense_type && <button onClick={() => setExpenseFilter({ expense_type: '' })} className="text-sm text-blue-600 hover:underline">Clear</button>}
          </div>

          {expensesLoading ? (
            <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
          ) : expenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <Wallet className="mx-auto h-8 w-8 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No expenses recorded for this vehicle.</p>
              <button onClick={() => setShowAddExpense(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <Wallet className="h-4 w-4" /> Add First Expense
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${expenseColor[expense.expense_type] || 'bg-gray-100 text-gray-700'}`}>
                      {expense.expense_type_display || expense.expense_type}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Rs. {Number(expense.amount).toLocaleString('en-IN')}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                        <span><Calendar className="inline h-3 w-3 mr-1" />{new Date(expense.expense_date).toLocaleDateString('en-IN')}</span>
                        {expense.driver_name && <span><User className="inline h-3 w-3 mr-1" />{expense.driver_name}</span>}
                        {expense.payment_mode && <span className="capitalize">{expense.payment_mode}</span>}
                      </div>
                      {expense.description && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{expense.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    {expense.is_deducted && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 mr-1">Deducted</span>}
                    <button onClick={() => setEditExpense(expense)} className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteExpenseId(expense.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleDetail;
