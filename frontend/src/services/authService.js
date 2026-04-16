import api from './api';

const authService = {
  // Send OTP
  sendOTP: (phone) => {
    return api.post('/auth/otp/send/', { phone });
  },

  // Verify OTP
  verifyOTP: (phoneOrPayload, otp) => {
    const payload =
      typeof phoneOrPayload === 'object' && phoneOrPayload !== null
        ? phoneOrPayload
        : { phone: phoneOrPayload, otp };

    return api.post('/auth/otp/verify/', payload);
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

  forgotPassword: (phone) => {
    return api.post('/auth/password/forgot/', { phone });
  },

  resetPassword: (payload) => {
    return api.post('/auth/password/reset/', payload);
  },

  createCoordinator: (payload) => {
    return api.post('/auth/coordinators/', payload);
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
