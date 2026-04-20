import api from './api';

const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const reportService = {
  /**
   * Monthly MIS Excel - Date|Driver|Vehicle|Store1|KM1|Store2|KM2|TotalKM
   * @param {number} year
   * @param {number} month
   * @param {string} [vehicleId]
   */
  downloadMonthlyMIS: async (year, month, vehicleId = null) => {
    const params = { year, month };
    if (vehicleId) params.vehicle_id = vehicleId;

    const response = await api.get('/reports/monthly-mis/', {
      params,
      responseType: 'blob',
    });

    const filename = `MIS_${String(month).padStart(2, '0')}_${year}.xlsx`;
    triggerDownload(response.data, filename);
  },

  /**
   * Expense report Excel with optional filters
   * @param {Object} filters - { startDate, endDate, driverId, vehicleId, expenseType }
   */
  downloadExpenseReport: async (filters = {}) => {
    const params = {};
    if (filters.startDate) params.start_date = filters.startDate;
    if (filters.endDate) params.end_date = filters.endDate;
    if (filters.driverId) params.driver_id = filters.driverId;
    if (filters.vehicleId) params.vehicle_id = filters.vehicleId;
    if (filters.expenseType) params.expense_type = filters.expenseType;

    const response = await api.get('/reports/expenses/', {
      params,
      responseType: 'blob',
    });

    const suffix = filters.startDate && filters.endDate
      ? `${filters.startDate}_${filters.endDate}`
      : 'all';
    triggerDownload(response.data, `Expenses_${suffix}.xlsx`);
  },

  /**
   * Payment summary as Excel or PDF
   * @param {number} year
   * @param {number} month
   * @param {'excel'|'pdf'} format
   */
  downloadPaymentSummary: async (year, month, format = 'excel') => {
    const response = await api.get('/reports/payment-summary/', {
      params: { year, month, format },
      responseType: 'blob',
    });

    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    triggerDownload(response.data, `Payments_${String(month).padStart(2, '0')}_${year}.${ext}`);
  },
};

export default reportService;
