import api from './api';

const dashboardService = {
  getOwnerDashboard: (params = {}) => api.get('/dashboard/owner/', { params }),
  getDriverDashboard: (params = {}) => api.get('/dashboard/driver/', { params }),
  getDailySummary: (params = {}) => api.get('/dashboard/daily-summary/', { params }),
  getMonthlyReport: (params = {}) => api.get('/dashboard/monthly-report/', { params }),
};

export default dashboardService;
