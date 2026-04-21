import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateTrip } from '../../hooks/useTrips';
import { useAuthStore } from '../../store/authStore';

import tripService from '../../services/tripService';

// ---------- Store search dropdown ----------
const StoreSearch = ({ value, onChange, placeholder, required }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    search(val);
  };

  const select = (store) => {
    setQuery(store.name);
    onChange(store.name);
    setOpen(false);
    setResults([]);
  };

  const clear = () => {
    setQuery('');
    onChange('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => query && results.length > 0 && setOpen(true)}
          placeholder={placeholder || 'Search store…'}
          required={required}
          autoComplete="off"
          className="w-full rounded-2xl border border-gray-300 py-3 pl-11 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No stores found — you can type the name manually</div>
          ) : (
            results.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => select(store)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium text-gray-900">{store.name}</span>
                {store.area && (
                  <span className="ml-2 text-xs text-gray-500">{store.area}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ---------- Main AddTrip ----------
const emptyForm = {
  trip_date: new Date().toISOString().split('T')[0],
  trip_category: 'regular',
  gate_pass_image: null,
  map_image: null,
  gate_pass_preview: null,
  map_preview: null,
  store_name_1: '',
  one_way_km_1: '',
  dispatch_time_1: '',
  store_name_2: '',
  one_way_km_2: '',
  dispatch_time_2: '',
  remarks: '',
};

const AddTrip = () => {
  const navigate = useNavigate();
  const { driverProfile, isDriver } = useAuthStore();
  const { createTrip, isCreating } = useCreateTrip();
  const fileInputRef = useRef(null);
  const mapInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [showStore2, setShowStore2] = useState(false);

  const handleImageSelect = (type, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((cur) => ({
        ...cur,
        [`${type}_image`]: file,
        [`${type}_preview`]: e.target?.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const totalKm = () => {
    const k1 = parseFloat(formData.one_way_km_1) || 0;
    const k2 = parseFloat(formData.one_way_km_2) || 0;
    return (k1 * 2 + k2 * 2).toFixed(1);
  };

  const validateStep2 = () => {
    if (!formData.store_name_1.trim() || !formData.one_way_km_1) {
      toast.error('Trip 1 store and KM are required');
      return false;
    }
    if (formData.store_name_2.trim() && !formData.one_way_km_2) {
      toast.error('Trip 2 KM is required when store is provided');
      return false;
    }
    if (formData.one_way_km_2 && !formData.store_name_2.trim()) {
      toast.error('Trip 2 store is required when KM is provided');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateStep2()) return;
    const payload = {
      trip_date: formData.trip_date,
      trip_category: formData.trip_category,
      gate_pass_image: formData.gate_pass_image,
      map_screenshot: formData.map_image,
      store_name_1: formData.store_name_1.trim(),
      one_way_km_1: parseFloat(formData.one_way_km_1),
      dispatch_time_1: formData.dispatch_time_1 || undefined,
      store_name_2: formData.store_name_2.trim() || undefined,
      one_way_km_2: formData.one_way_km_2 ? parseFloat(formData.one_way_km_2) : undefined,
      dispatch_time_2: formData.dispatch_time_2 || undefined,
      remarks: formData.remarks.trim(),
    };
    createTrip(payload, {
      onSuccess: () => {
        setFormData(emptyForm);
        navigate('/driver/my-trips');
      },
    });
  };

  const canProceedToStep2 = Boolean(formData.gate_pass_image && formData.map_image);
  const canSubmit = Boolean(formData.store_name_1.trim() && formData.one_way_km_1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/driver/dashboard')}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Add Trip</h1>
            <p className="mt-1 text-sm text-gray-500">
              Submit your daily trip — upload photos then fill store details.
            </p>
          </div>
          <div className="hidden rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700 lg:block">
            Vehicle: {driverProfile?.primary_vehicle?.vehicle_number || 'Not assigned'}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center gap-3">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
            <span>Step 1: Upload images</span>
            <span>Step 2: Store &amp; KM</span>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            {/* Date + Category */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trip Date</label>
                <input
                  type="date"
                  value={formData.trip_date}
                  onChange={(e) => setFormData((c) => ({ ...c, trip_date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trip Type</label>
                <select
                  value={formData.trip_category}
                  onChange={(e) => setFormData((c) => ({ ...c, trip_category: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="regular">Regular</option>
                  {!isDriver() && <option value="adhoc">Adhoc</option>}
                </select>
              </div>
            </div>

            {/* Gate pass */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gate Pass Photo <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleImageSelect('gate_pass', e.target.files?.[0])}
                className="hidden"
              />
              {formData.gate_pass_preview ? (
                <div className="relative overflow-hidden rounded-3xl border border-gray-200">
                  <img src={formData.gate_pass_preview} alt="Gate pass" className="h-52 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-3 right-3 rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-52 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition"
                >
                  <div className="rounded-full bg-white p-3 shadow-sm">
                    <Camera className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Capture gate pass</div>
                    <div className="text-sm text-blue-600">Tap to take or upload photo</div>
                  </div>
                </button>
              )}
            </div>

            {/* Map screenshot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Maps Screenshot <span className="text-red-500">*</span>
              </label>
              <input
                ref={mapInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect('map', e.target.files?.[0])}
                className="hidden"
              />
              {formData.map_preview ? (
                <div className="relative overflow-hidden rounded-3xl border border-gray-200">
                  <img src={formData.map_preview} alt="Map" className="h-52 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => mapInputRef.current?.click()}
                    className="absolute bottom-3 right-3 rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => mapInputRef.current?.click()}
                  className="flex h-52 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 transition"
                >
                  <div className="rounded-full bg-white p-3 shadow-sm">
                    <MapPin className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Upload route screenshot</div>
                    <div className="text-sm text-emerald-600">Attach your Google Maps proof</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Checklist sidebar */}
          <div className="rounded-3xl bg-gray-900 p-6 text-white shadow-sm">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-blue-100">Checklist</div>
              <ul className="mt-3 space-y-3 text-sm text-gray-100">
                {[
                  { done: !!formData.gate_pass_image, label: 'Gate pass photo uploaded' },
                  { done: !!formData.map_image, label: 'Google Maps screenshot uploaded' },
                  { done: false, label: 'Step 2 — enter store & KM' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${item.done ? 'bg-emerald-400 text-gray-900' : 'bg-white/10 text-white'}`}>
                      {item.done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/60 transition"
            >
              Continue to Step 2
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              Enter one-way KM from the Google Maps screenshot — round-trip is calculated automatically.
            </div>

            {/* Store 1 */}
            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                  <Navigation className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Store 1</h2>
                  <p className="text-xs text-gray-500">Required</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Store Name</label>
                  <StoreSearch
                    value={formData.store_name_1}
                    onChange={(v) => setFormData((c) => ({ ...c, store_name_1: v }))}
                    placeholder="Search e.g. Tubrahalli"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">One-way KM</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.one_way_km_1}
                      onChange={(e) => setFormData((c) => ({ ...c, one_way_km_1: e.target.value }))}
                      placeholder="e.g. 26"
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                    {formData.one_way_km_1 && (
                      <p className="mt-1 text-xs text-gray-500">Round trip: {(parseFloat(formData.one_way_km_1) * 2).toFixed(1)} km</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Dispatch Time <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="time"
                      value={formData.dispatch_time_1}
                      onChange={(e) => setFormData((c) => ({ ...c, dispatch_time_1: e.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Store 2 — shown only when added */}
            {showStore2 ? (
              <div className="rounded-2xl border border-emerald-200 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                      <Navigation className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Store 2</h2>
                      <p className="text-xs text-gray-500">Optional</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowStore2(false); setFormData((c) => ({ ...c, store_name_2: '', one_way_km_2: '', dispatch_time_2: '' })); }}
                    className="rounded-lg px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Store Name</label>
                    <StoreSearch
                      value={formData.store_name_2}
                      onChange={(v) => setFormData((c) => ({ ...c, store_name_2: v }))}
                      placeholder="Search e.g. Sobha Oasis"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">One-way KM</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.one_way_km_2}
                        onChange={(e) => setFormData((c) => ({ ...c, one_way_km_2: e.target.value }))}
                        placeholder="e.g. 14"
                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      {formData.one_way_km_2 && (
                        <p className="mt-1 text-xs text-gray-500">Round trip: {(parseFloat(formData.one_way_km_2) * 2).toFixed(1)} km</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Dispatch Time <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        type="time"
                        value={formData.dispatch_time_2}
                        onChange={(e) => setFormData((c) => ({ ...c, dispatch_time_2: e.target.value }))}
                        className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowStore2(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-200 py-4 text-sm font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition"
              >
                + Add 2nd store
              </button>
            )}

            {/* Remarks */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData((c) => ({ ...c, remarks: e.target.value }))}
                rows={3}
                placeholder="Any notes for the coordinator (e.g. 2 gate passes shared)"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>
          </div>

          {/* Summary sidebar */}
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Trip Summary</div>
              <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                <div className="text-sm text-blue-700">Total round-trip KM</div>
                <div className="mt-1 text-3xl font-bold text-blue-900">{totalKm()} km</div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Date</span>
                  <span className="font-medium text-gray-900">{formData.trip_date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className={`font-medium capitalize ${formData.trip_category === 'adhoc' ? 'text-orange-600' : 'text-gray-900'}`}>
                    {formData.trip_category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Store 1</span>
                  <span className="font-medium text-gray-900 text-right max-w-[55%] truncate">
                    {formData.store_name_1 || '—'}
                  </span>
                </div>
                {showStore2 && (
                  <div className="flex justify-between">
                    <span>Store 2</span>
                    <span className="font-medium text-gray-900 text-right max-w-[55%] truncate">
                      {formData.store_name_2 || 'Not filled'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isCreating}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 transition"
              >
                {isCreating ? 'Submitting…' : 'Submit Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTrip;
