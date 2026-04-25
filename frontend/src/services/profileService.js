import api from './api';

const profileService = {
  getProfile: () => api.get('/auth/profile/'),

  updateProfile: (data) => api.patch('/auth/profile/', data),

  changePassword: (data) => api.post('/auth/profile/change-password/', data),

  updateDriverProfile: (data) => api.patch('/auth/profile/driver/', data),
};

export default profileService;
