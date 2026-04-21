import api from './api';

const expenseService = {
  getExpenses: (params = {}) => api.get('/expenses/', { params }),
  getMyExpenses: (params = {}) => api.get('/expenses/my-expenses/', { params }),
  getExpense: (expenseId) => api.get(`/expenses/${expenseId}/`),
  createExpense: (data) => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    return api.post('/expenses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateExpense: (expenseId, data) => api.patch(`/expenses/${expenseId}/`, data),
  deleteExpense: (expenseId) => api.delete(`/expenses/${expenseId}/`),
};

export default expenseService;
