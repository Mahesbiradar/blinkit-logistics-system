import api from './api';

const tripService = {
  // Get all trips (admin/coordinator)
  getTrips: (params = {}) => {
    return api.get('/trips/', { params });
  },

  // Get my trips (driver)
  getMyTrips: (params = {}) => {
    return api.get('/trips/my-trips/', { params });
  },

  // Get pending trips
  getPendingTrips: () => {
    return api.get('/trips/pending/');
  },

  // Get trip details
  getTrip: (tripId) => {
    return api.get(`/trips/${tripId}/`);
  },

  // Create trip
  createTrip: (data) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(data).forEach((key) => {
      if (key !== 'gate_pass_image' && key !== 'map_screenshot') {
        if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      }
    });

    // Add files
    if (data.gate_pass_image) {
      formData.append('gate_pass_image', data.gate_pass_image);
    }
    if (data.map_screenshot) {
      formData.append('map_screenshot', data.map_screenshot);
    }

    return api.post('/trips/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Update trip
  updateTrip: (tripId, data) => {
    return api.patch(`/trips/${tripId}/`, data);
  },

  // Approve trip
  approveTrip: (tripId, remarks = '') => {
    return api.post(`/trips/${tripId}/approve/`, { remarks });
  },

  // Reject trip
  rejectTrip: (tripId, rejectionReason) => {
    return api.post(`/trips/${tripId}/reject/`, { rejection_reason: rejectionReason });
  },

  // Get trip stats
  getTripStats: (params = {}) => {
    return api.get('/trips/stats/', { params });
  },

  // Store master
  searchStores: (q = '') => {
    return api.get('/trips/stores/', { params: { q } });
  },
  createStore: (data) => {
    return api.post('/trips/stores/', data);
  },
  updateStore: (storeId, data) => {
    return api.patch(`/trips/stores/${storeId}/`, data);
  },
};

export default tripService;
