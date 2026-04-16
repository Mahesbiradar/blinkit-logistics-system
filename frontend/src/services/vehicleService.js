import api from './api';

const vehicleService = {
  getVehicles: (params = {}) => api.get('/vehicles/', { params }),
  getVehicle: (vehicleId) => api.get(`/vehicles/${vehicleId}/`),
  createVehicle: (data) => api.post('/vehicles/', data),
  updateVehicle: (vehicleId, data) => api.patch(`/vehicles/${vehicleId}/`, data),
  assignDriver: (vehicleId, data) => api.post(`/vehicles/${vehicleId}/assign-driver/`, data),
  getVendors: () => api.get('/vehicles/vendors/'),
};

export default vehicleService;
