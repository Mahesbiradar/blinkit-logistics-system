import api from './api';

const authService = {
  // Send OTP
  sendOTP: (phone) => {
    return api.post('/auth/otp/send/', { phone });
  },

  // Verify OTP
  verifyOTP: (phone, otp) => {
    return api.post('/auth/otp/verify/', { phone, otp });
  },

  // Driver registration
  registerDriver: (data, tempToken) => {
    return api.post('/auth/driver/register/', data, {
      headers: {
        Authorization: `Bearer ${tempToken}`,
      },
    });
  },

  // Admin/Coordinator login
  login: (email, password) => {
    return api.post('/auth/login/', { email, password });
  },

  // Refresh token
  refreshToken: (refreshToken) => {
    return api.post('/auth/token/refresh/', { refresh: refreshToken });
  },

  // Get profile
  getProfile: () => {
    return api.get('/auth/profile/');
  },
};

export default authService;
