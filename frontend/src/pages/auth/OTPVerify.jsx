import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const OTPVerify = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, isLoading } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const phone = location.state?.phone || sessionStorage.getItem('otp_phone');

  useEffect(() => {
    if (!phone) {
      navigate('/login', { replace: true });
      return;
    }
    inputRefs.current[0]?.focus();
  }, [phone, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullOtp = [...newOtp.slice(0, 5), value].join('');
      if (fullOtp.length === 6) {
        handleSubmit(fullOtp);
      }
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (fullOtp) => {
    if (fullOtp.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    verifyOTP(
      { phone, otp: fullOtp },
      {
        onError: () => {
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        },
      }
    );
  };

  const handleResend = () => {
    if (!phone) {
      toast.error('Phone number not found');
      return;
    }

    sendOTP(phone, {
      onSuccess: () => {
        toast.success('OTP resent');
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/login')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verify OTP</h1>
            <p className="text-gray-600 mt-2">
              Enter the 6-digit code sent to
              <br />
              <span className="font-medium text-gray-900">+91 {phone}</span>
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              />
            ))}
          </div>

          <button
            onClick={() => handleSubmit(otp.join(''))}
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              'Verify'
            )}
          </button>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Did not receive the code?{' '}
              <button onClick={handleResend} className="text-blue-600 font-medium hover:underline">
                Resend
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerify;
