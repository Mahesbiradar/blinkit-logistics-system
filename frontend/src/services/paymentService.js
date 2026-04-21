import api from './api';

const paymentService = {
  getPayments: (params = {}) => api.get('/payments/', { params }),

  getPayment: (id) => api.get(`/payments/${id}/`),

  createPayment: (data) => api.post('/payments/', data),

  calculatePayment: (data) => api.post('/payments/calculate/', data),

  markPaid: (id, data) => api.post(`/payments/${id}/mark-paid/`, data),
};

export default paymentService;
