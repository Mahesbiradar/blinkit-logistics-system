import api from './api';

const vehicleService = {
  getVehicles: (params = {}) => api.get('/vehicles/', { params }),
  getVehicle: (vehicleId) => api.get(`/vehicles/${vehicleId}/`),
  createVehicle: (data) => api.post('/vehicles/', data),
  updateVehicle: (vehicleId, data) => api.patch(`/vehicles/${vehicleId}/`, data),
  assignDriver: (vehicleId, data) => api.post(`/vehicles/${vehicleId}/assign-driver/`, data),
  createDriver: (vehicleId, data) => api.post(`/vehicles/${vehicleId}/create-driver/`, data),
  updateDriverLogin: (vehicleId, data) => api.patch(`/vehicles/${vehicleId}/driver-login/`, data),
  deleteVehicle: (vehicleId) => api.delete(`/vehicles/${vehicleId}/`),
  getVendors: () => api.get('/vehicles/vendors/'),
  createVendor: (data) => api.post('/vehicles/vendors/', data),
};

export default vehicleService;
