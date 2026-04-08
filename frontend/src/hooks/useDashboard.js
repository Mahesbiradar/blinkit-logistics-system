import { useQuery } from 'react-query';
import api from '../services/api';

// Fetch owner dashboard data
const fetchOwnerDashboard = async (params = {}) => {
  const response = await api.get('/dashboard/owner/', { params });
  return response.data;
};

// Fetch driver dashboard data
const fetchDriverDashboard = async (params = {}) => {
  const response = await api.get('/dashboard/driver/', { params });
  return response.data;
};

// Fetch daily summary
const fetchDailySummary = async (params = {}) => {
  const response = await api.get('/dashboard/daily-summary/', { params });
  return response.data;
};

// Fetch monthly report
const fetchMonthlyReport = async (params = {}) => {
  const response = await api.get('/dashboard/monthly-report/', { params });
  return response.data;
};

// Hook for owner dashboard
export const useOwnerDashboard = (params = {}) => {
  return useQuery({
    queryKey: ['ownerDashboard', params],
    queryFn: () => fetchOwnerDashboard(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for driver dashboard
export const useDriverDashboard = (params = {}) => {
  return useQuery({
    queryKey: ['driverDashboard', params],
    queryFn: () => fetchDriverDashboard(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for daily summary
export const useDailySummary = (params = {}) => {
  return useQuery({
    queryKey: ['dailySummary', params],
    queryFn: () => fetchDailySummary(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook for monthly report
export const useMonthlyReport = (params = {}) => {
  return useQuery({
    queryKey: ['monthlyReport', params],
    queryFn: () => fetchMonthlyReport(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
