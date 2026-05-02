import api from './api';

export const EXPENSE_TYPES = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'driver_advance', label: 'Driver Advance' },
  { value: 'driver_payment', label: 'Driver Payment' },
  { value: 'emi', label: 'EMI' },
  { value: 'fastag_recharge', label: 'Fastag Recharge' },
  { value: 'adhoc_driver', label: 'Adhoc Driver' },
  { value: 'repair', label: 'Repair' },
  { value: 'accident', label: 'Accident' },
  { value: 'fine', label: 'Fine' },
  { value: 'food', label: 'Food' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_MODES = [
  { value: 'phonepay', label: 'PhonePay' },
  { value: 'kiwi', label: 'Kiwi' },
  { value: 'amazon_pay', label: 'Amazon Pay' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export const COMPANY_EXPENSE_TYPES = [
  { value: 'coordinator_salary', label: 'Coordinator Salary' },
  { value: 'room_rent', label: 'Room Rent' },
  { value: 'spare_driver', label: 'Spare Driver' },
  { value: 'food', label: 'Food' },
  { value: 'advance', label: 'Advance' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'other', label: 'Other' },
];

const toFormData = (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      formData.append(key, value);
    }
  });
  return formData;
};

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

const expenseService = {
  getExpenses: (params = {}) => api.get('/expenses/', { params }),
  getExpense: (id) => api.get(`/expenses/${id}/`),
  createExpense: (data) => api.post('/expenses/', toFormData(data), multipart),
  updateExpense: (id, data) => api.patch(`/expenses/${id}/`, toFormData(data), multipart),
  deleteExpense: (id) => api.delete(`/expenses/${id}/`),
  getExpenseSummary: (params = {}) => api.get('/expenses/summary/', { params }),

  getMyExpenses: (params = {}) => api.get('/expenses/my-expenses/', { params }),

  getFastagRecords: (params = {}) => api.get('/expenses/fastag/', { params }),
  getFastagRecord: (id) => api.get(`/expenses/fastag/${id}/`),
  createFastagRecord: (data) => api.post('/expenses/fastag/', data),
  updateFastagRecord: (id, data) => api.patch(`/expenses/fastag/${id}/`, toFormData(data), multipart),
  refreshFastagRecharge: (id) => api.post(`/expenses/fastag/${id}/refresh-recharge/`),
  markFastagClosed: (id) => api.post(`/expenses/fastag/${id}/mark-closed/`),
  reopenFastag: (id) => api.post(`/expenses/fastag/${id}/reopen/`),

  getCompanyExpenses: (params = {}) => api.get('/company-expenses/', { params }),
  getCompanyExpense: (id) => api.get(`/company-expenses/${id}/`),
  createCompanyExpense: (data) => api.post('/company-expenses/', toFormData(data), multipart),
  updateCompanyExpense: (id, data) => api.patch(`/company-expenses/${id}/`, toFormData(data), multipart),
  deleteCompanyExpense: (id) => api.delete(`/company-expenses/${id}/`),
  getCompanyExpenseSummary: (params = {}) => api.get('/company-expenses/summary/', { params }),
};

export default expenseService;
