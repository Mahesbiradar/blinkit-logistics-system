import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Phone, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const Login = () => {
  const navigate = useNavigate();
  const { sendOTP, login, isLoading } = useAuth();
  const [loginType, setLoginType] = useState('driver');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleDriverLogin = (event) => {
    event.preventDefault();

    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    sessionStorage.setItem('otp_phone', phone);
    sendOTP(phone, {
      onSuccess: () => {
        navigate('/verify-otp', { state: { phone } });
      },
    });
  };

  const handleAdminLogin = (event) => {
    event.preventDefault();

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    login({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">JJR Logistics</h1>
          <p className="text-gray-600 mt-1">Trip and expense management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setLoginType('driver')}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
                loginType === 'driver'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Phone className="w-4 h-4" />
              Driver Login
            </button>
            <button
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
                loginType === 'admin'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              Admin Login
            </button>
          </div>

          <div className="p-6">
            {loginType === 'driver' ? (
              <form onSubmit={handleDriverLogin}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter your phone number"
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">We will send an OTP to verify your number.</p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || phone.length !== 10}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminLogin}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="mb-6 text-right">
                  <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Login
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Copyright 2026 JJR Logistics. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
