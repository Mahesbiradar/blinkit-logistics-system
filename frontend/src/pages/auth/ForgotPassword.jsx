import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword, isLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    phone: '',
    otp: '',
    new_password: '',
    confirm_password: '',
  });

  const handleSendOtp = (event) => {
    event.preventDefault();
    if (form.phone.length !== 10) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }

    forgotPassword(form.phone, {
      onSuccess: () => {
        setStep(2);
      },
    });
  };

  const handleResetPassword = (event) => {
    event.preventDefault();

    if (form.otp.length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }

    if (form.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (form.new_password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    resetPassword({
      phone: form.phone,
      otp: form.otp,
      new_password: form.new_password,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>

        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              {step === 1 ? <KeyRound className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
            <p className="mt-2 text-sm text-gray-500">
              {step === 1
                ? 'Request a password reset OTP using your registered admin phone number.'
                : 'Enter the OTP and choose a new password.'}
            </p>
          </div>

          {step === 1 ? (
            <form className="space-y-4" onSubmit={handleSendOtp}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Phone number</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-14 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Enter your registered phone"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isLoading ? 'Sending OTP...' : 'Send Reset OTP'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">OTP</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.otp}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      otp: event.target.value.replace(/\D/g, '').slice(0, 6),
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Enter 6-digit OTP"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">New password</span>
                <input
                  type="password"
                  value={form.new_password}
                  onChange={(event) => setForm((current) => ({ ...current, new_password: event.target.value }))}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Minimum 8 characters"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Confirm password</span>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, confirm_password: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Remembered your password?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
