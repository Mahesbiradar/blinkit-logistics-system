import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  MapPin,
  Navigation,
  Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateTrip } from '../../hooks/useTrips';
import { useAuthStore } from '../../store/authStore';

const emptyForm = {
  trip_date: new Date().toISOString().split('T')[0],
  gate_pass_image: null,
  map_screenshot: null,
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
  const { driverProfile } = useAuthStore();
  const { createTrip, isCreating } = useCreateTrip();
  const fileInputRef = useRef(null);
  const mapInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(emptyForm);

  const handleImageSelect = (type, file) => {
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((current) => ({
        ...current,
        [`${type}_image`]: file,
        [`${type}_preview`]: event.target?.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const calculateTotalKm = () => {
    const km1 = parseFloat(formData.one_way_km_1) || 0;
    const km2 = parseFloat(formData.one_way_km_2) || 0;
    return (km1 * 2 + km2 * 2).toFixed(1);
  };

  const validateStepTwo = () => {
    if (!formData.store_name_1.trim() || !formData.one_way_km_1) {
      toast.error('Trip 1 store and KM are required');
      return false;
    }

    if (formData.store_name_2.trim() && !formData.one_way_km_2) {
      toast.error('Trip 2 KM is required when store name is provided');
      return false;
    }

    if (formData.one_way_km_2 && !formData.store_name_2.trim()) {
      toast.error('Trip 2 store is required when KM is provided');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateStepTwo()) {
      return;
    }

    const submitData = {
      trip_date: formData.trip_date,
      gate_pass_image: formData.gate_pass_image,
      map_screenshot: formData.map_screenshot,
      store_name_1: formData.store_name_1.trim(),
      one_way_km_1: parseFloat(formData.one_way_km_1),
      dispatch_time_1: formData.dispatch_time_1 || undefined,
      store_name_2: formData.store_name_2.trim() || undefined,
      one_way_km_2: formData.one_way_km_2 ? parseFloat(formData.one_way_km_2) : undefined,
      dispatch_time_2: formData.dispatch_time_2 || undefined,
      remarks: formData.remarks.trim(),
    };

    createTrip(submitData, {
      onSuccess: () => {
        setFormData(emptyForm);
        navigate('/driver/my-trips');
      },
    });
  };

  const canProceedToStep2 = Boolean(formData.gate_pass_image && formData.map_screenshot);
  const canSubmit = Boolean(formData.store_name_1.trim() && formData.one_way_km_1);

  return (
    <div className="space-y-6">
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
            <p className="mt-2 text-sm text-gray-500">
              Submit your daily trip in two quick steps using the existing backend flow.
            </p>
          </div>
          <div className="hidden rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700 lg:block">
            Vehicle: {driverProfile?.primary_vehicle?.vehicle_number || 'Not assigned'}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-3">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
            <span>Step 1: Upload images</span>
            <span>Step 2: Store and KM</span>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trip Date</label>
              <input
                type="date"
                value={formData.trip_date}
                onChange={(event) => setFormData((current) => ({ ...current, trip_date: event.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gate Pass Photo <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => handleImageSelect('gate_pass', event.target.files?.[0])}
                className="hidden"
              />
              {formData.gate_pass_preview ? (
                <div className="relative overflow-hidden rounded-3xl border border-gray-200">
                  <img
                    src={formData.gate_pass_preview}
                    alt="Gate pass preview"
                    className="h-64 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-4 right-4 rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-400 hover:bg-blue-100"
                >
                  <div className="rounded-full bg-white p-4 shadow-sm">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Capture gate pass</div>
                    <div className="text-sm text-blue-600">Tap to upload a clear image</div>
                  </div>
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Maps Screenshot <span className="text-red-500">*</span>
              </label>
              <input
                ref={mapInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => handleImageSelect('map', event.target.files?.[0])}
                className="hidden"
              />
              {formData.map_preview ? (
                <div className="relative overflow-hidden rounded-3xl border border-gray-200">
                  <img
                    src={formData.map_preview}
                    alt="Map preview"
                    className="h-64 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => mapInputRef.current?.click()}
                    className="absolute bottom-4 right-4 rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => mapInputRef.current?.click()}
                  className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
                >
                  <div className="rounded-full bg-white p-4 shadow-sm">
                    <MapPin className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Upload route screenshot</div>
                    <div className="text-sm text-emerald-600">Attach your Google Maps proof</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-gray-900 p-6 text-white shadow-sm">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-blue-100">Checklist</div>
              <ul className="mt-3 space-y-3 text-sm text-gray-100">
                <li className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${formData.gate_pass_image ? 'bg-emerald-400 text-gray-900' : 'bg-white/10 text-white'}`}>
                    {formData.gate_pass_image ? <Check className="h-4 w-4" /> : '1'}
                  </span>
                  Gate pass image uploaded
                </li>
                <li className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${formData.map_screenshot ? 'bg-emerald-400 text-gray-900' : 'bg-white/10 text-white'}`}>
                    {formData.map_screenshot ? <Check className="h-4 w-4" /> : '2'}
                  </span>
                  Google Maps screenshot uploaded
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white">3</span>
                  Step 2 will capture store and KM details
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/60"
            >
              Continue to Step 2
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-medium text-blue-900">Step 2</div>
              <div className="mt-1 text-sm text-blue-700">
                Add store names and one-way KM. Round-trip KM is calculated automatically.
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                  <Navigation className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Trip 1</h2>
                  <p className="text-xs text-gray-500">Required</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Store Name</span>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.store_name_1}
                      onChange={(event) => setFormData((current) => ({ ...current, store_name_1: event.target.value }))}
                      placeholder="e.g. Tubrahalli ES-131"
                      className="w-full rounded-2xl border border-gray-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">One-way KM</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.one_way_km_1}
                      onChange={(event) => setFormData((current) => ({ ...current, one_way_km_1: event.target.value }))}
                      placeholder="e.g. 52"
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Dispatch Time</span>
                    <input
                      type="time"
                      value={formData.dispatch_time_1}
                      onChange={(event) => setFormData((current) => ({ ...current, dispatch_time_1: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                  <Navigation className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Trip 2</h2>
                  <p className="text-xs text-gray-500">Optional</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Store Name</span>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={formData.store_name_2}
                      onChange={(event) => setFormData((current) => ({ ...current, store_name_2: event.target.value }))}
                      placeholder="e.g. Sobha Oasis ES-120"
                      className="w-full rounded-2xl border border-gray-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">One-way KM</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.one_way_km_2}
                      onChange={(event) => setFormData((current) => ({ ...current, one_way_km_2: event.target.value }))}
                      placeholder="e.g. 28"
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Dispatch Time</span>
                    <input
                      type="time"
                      value={formData.dispatch_time_2}
                      onChange={(event) => setFormData((current) => ({ ...current, dispatch_time_2: event.target.value }))}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                </div>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Remarks</span>
              <textarea
                value={formData.remarks}
                onChange={(event) => setFormData((current) => ({ ...current, remarks: event.target.value }))}
                rows={4}
                placeholder="Any notes for the coordinator"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Trip summary</div>
              <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                <div className="text-sm text-blue-700">Estimated round-trip KM</div>
                <div className="mt-1 text-3xl font-bold text-blue-900">{calculateTotalKm()} km</div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Trip date</span>
                  <span className="font-medium text-gray-900">{formData.trip_date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Trip 1</span>
                  <span className="font-medium text-gray-900">{formData.store_name_1 || 'Not added'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Trip 2</span>
                  <span className="font-medium text-gray-900">{formData.store_name_2 || 'Optional'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isCreating}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isCreating ? 'Submitting...' : 'Submit Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTrip;
