import api from './api';

const driverService = {
  getDrivers: (params = {}) => api.get('/drivers/', { params }),
  getDriver: (driverId) => api.get(`/drivers/${driverId}/`),
  createDriver: (data) => api.post('/drivers/', data),
  updateDriver: (driverId, data) => api.patch(`/drivers/${driverId}/`, data),
};

export default driverService;
