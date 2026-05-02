import api from './api';

const paymentService = {
  getSettlements: (params = {}) => api.get('/settlements/', { params }),

  getSettlement: (id) => api.get(`/settlements/${id}/`),

  getSettlementSummary: (params = {}) => api.get('/settlements/summary/', { params }),

  createSettlement: (data) => api.post('/settlements/', data),

  updateSettlement: (id, data) => api.patch(`/settlements/${id}/`, data),

  calculateSettlement: (id) => api.post(`/settlements/${id}/calculate/`),

  finalizeSettlement: (id) => api.post(`/settlements/${id}/finalize/`),

  markPaid: (id, data) => api.post(`/settlements/${id}/mark-paid/`, data),

  reopenSettlement: (id) => api.post(`/settlements/${id}/reopen/`),

  // Legacy aliases so existing hooks continue to work without changes
  getPayments: (params = {}) => api.get('/settlements/', { params }),
  getPayment: (id) => api.get(`/settlements/${id}/`),
  createPayment: (data) => api.post('/settlements/', data),
  updatePayment: (id, data) => api.patch(`/settlements/${id}/`, data),
  calculatePayment: (id) => api.post(`/settlements/${id}/calculate/`),
  finalizePayment: (id) => api.post(`/settlements/${id}/finalize/`),
  reopenPayment: (id) => api.post(`/settlements/${id}/reopen/`),
};

export default paymentService;
