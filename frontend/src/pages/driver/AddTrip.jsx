import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Camera, 
  MapPin, 
  Upload,
  Check,
  ChevronRight,
  Store,
  Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTrips } from '../../hooks/useTrips';

const AddTrip = () => {
  const navigate = useNavigate();
  const { createTrip, isCreating } = useTrips();
  const fileInputRef = useRef(null);
  const mapInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
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
  });

  const handleImageSelect = (type, file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((prev) => ({
        ...prev,
        [`${type}_image`]: file,
        [`${type}_preview`]: e.target.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const calculateTotalKm = () => {
    const km1 = parseFloat(formData.one_way_km_1) || 0;
    const km2 = parseFloat(formData.one_way_km_2) || 0;
    return (km1 * 2 + km2 * 2).toFixed(1);
  };

  const handleSubmit = () => {
    if (!formData.store_name_1 || !formData.one_way_km_1) {
      toast.error('Please fill in at least Trip 1 details');
      return;
    }

    const submitData = {
      trip_date: formData.trip_date,
      gate_pass_image: formData.gate_pass_image,
      map_screenshot: formData.map_screenshot,
      store_name_1: formData.store_name_1,
      one_way_km_1: parseFloat(formData.one_way_km_1),
      dispatch_time_1: formData.dispatch_time_1 || undefined,
      store_name_2: formData.store_name_2 || undefined,
      one_way_km_2: formData.one_way_km_2 ? parseFloat(formData.one_way_km_2) : undefined,
      dispatch_time_2: formData.dispatch_time_2 || undefined,
      remarks: formData.remarks,
    };

    createTrip(submitData, {
      onSuccess: () => {
        toast.success('Trip submitted successfully!');
        navigate('/driver/dashboard');
      },
    });
  };

  const canProceedToStep2 = formData.gate_pass_image && formData.map_screenshot;
  const canSubmit = formData.store_name_1 && formData.one_way_km_1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate('/driver/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Add Trip</h1>
        </div>

        {/* Progress */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Step {step} of 2
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {step === 1 ? (
          <div className="space-y-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trip Date
              </label>
              <input
                type="date"
                value={formData.trip_date}
                onChange={(e) => setFormData({ ...formData, trip_date: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Gate Pass Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gate Pass Photo <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleImageSelect('gate_pass', e.target.files[0])}
                className="hidden"
              />
              
              {formData.gate_pass_preview ? (
                <div className="relative">
                  <img
                    src={formData.gate_pass_preview}
                    alt="Gate Pass"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white px-3 py-1 rounded-lg text-sm font-medium shadow-md"
                  >
                    Change
                  </button>
                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-700">Tap to capture</p>
                    <p className="text-sm text-gray-500">Gate pass image</p>
                  </div>
                </button>
              )}
            </div>

            {/* Map Screenshot Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Maps Screenshot <span className="text-red-500">*</span>
              </label>
              <input
                ref={mapInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect('map', e.target.files[0])}
                className="hidden"
              />
              
              {formData.map_preview ? (
                <div className="relative">
                  <img
                    src={formData.map_preview}
                    alt="Map Screenshot"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => mapInputRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-white px-3 py-1 rounded-lg text-sm font-medium shadow-md"
                  >
                    Change
                  </button>
                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => mapInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-700">Tap to upload</p>
                    <p className="text-sm text-gray-500">Google Maps screenshot</p>
                  </div>
                </button>
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Next Step
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Trip 1 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Trip 1</h3>
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Required</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.store_name_1}
                      onChange={(e) => setFormData({ ...formData, store_name_1: e.target.value })}
                      placeholder="e.g., Tubrahalli ES-131"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      One-way KM
                    </label>
                    <input
                      type="number"
                      value={formData.one_way_km_1}
                      onChange={(e) => setFormData({ ...formData, one_way_km_1: e.target.value })}
                      placeholder="e.g., 52"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dispatch Time
                    </label>
                    <input
                      type="time"
                      value={formData.dispatch_time_1}
                      onChange={(e) => setFormData({ ...formData, dispatch_time_1: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Trip 2 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Trip 2</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Optional</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.store_name_2}
                      onChange={(e) => setFormData({ ...formData, store_name_2: e.target.value })}
                      placeholder="e.g., Sobha Oasis ES-120"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      One-way KM
                    </label>
                    <input
                      type="number"
                      value={formData.one_way_km_2}
                      onChange={(e) => setFormData({ ...formData, one_way_km_2: e.target.value })}
                      placeholder="e.g., 28"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dispatch Time
                    </label>
                    <input
                      type="time"
                      value={formData.dispatch_time_2}
                      onChange={(e) => setFormData({ ...formData, dispatch_time_2: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total KM */}
            <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
              <span className="font-medium text-blue-900">Total KM (Round Trip)</span>
              <span className="text-2xl font-bold text-blue-600">{calculateTotalKm()} km</span>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isCreating}
                className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Submit Trip
                    <Check className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTrip;
