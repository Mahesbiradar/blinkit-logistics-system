import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Truck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const DriverRegister = () => {
  const navigate = useNavigate();
  const { registerDriver, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    license_number: '',
    vehicle_id: '',
  });

  useEffect(() => {
    const tempToken = localStorage.getItem('temp_token');
    if (!tempToken) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.first_name.trim()) {
      toast.error('First name is required');
      return;
    }

    if (!formData.vehicle_id.trim()) {
      toast.error('Vehicle ID is required');
      return;
    }

    const tempToken = localStorage.getItem('temp_token');
    if (!tempToken) {
      toast.error('Registration session expired. Please request OTP again.');
      navigate('/login', { replace: true });
      return;
    }

    registerDriver({
      data: {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        license_number: formData.license_number.trim(),
        vehicle_id: formData.vehicle_id.trim(),
      },
      tempToken,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="mx-auto w-full max-w-lg pt-8">
        <button
          onClick={() => navigate('/login')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>

        <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Driver Registration</h1>
            <p className="mt-2 text-sm text-gray-500">
              Finish your profile to unlock the driver portal. If you do not know the assigned
              vehicle ID, ask your coordinator to share it.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">First name</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange('first_name')}
                  placeholder="Enter your first name"
                  className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Last name</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange('last_name')}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">License number</span>
              <input
                type="text"
                value={formData.license_number}
                onChange={handleChange('license_number')}
                placeholder="Optional"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Assigned vehicle ID</span>
              <div className="relative">
                <Truck className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.vehicle_id}
                  onChange={handleChange('vehicle_id')}
                  placeholder="Paste the vehicle UUID"
                  className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </label>

            <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
              This screen uses your temporary OTP registration token. If the flow expires, go back
              to login and verify OTP again.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? 'Creating account...' : 'Complete registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DriverRegister;
