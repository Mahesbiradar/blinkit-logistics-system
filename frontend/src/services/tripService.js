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
    const imageFields = ['gate_pass_image', 'map_screenshot', 'gate_pass_image_2', 'map_screenshot_2'];

    Object.keys(data).forEach((key) => {
      if (!imageFields.includes(key) && data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    imageFields.forEach((key) => {
      if (data[key]) formData.append(key, data[key]);
    });

    return api.post('/trips/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // Update trip
  updateTrip: (tripId, data) => {
    const imageFields = ['gate_pass_image', 'map_screenshot', 'gate_pass_image_2', 'map_screenshot_2'];
    const hasImages = imageFields.some((k) => data[k] instanceof File);

    if (hasImages) {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (!imageFields.includes(key) && data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });
      imageFields.forEach((key) => { if (data[key]) formData.append(key, data[key]); });
      return api.patch(`/trips/${tripId}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.patch(`/trips/${tripId}/`, data);
  },

  // Delete trip
  deleteTrip: (tripId) => {
    return api.delete(`/trips/${tripId}/`);
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
