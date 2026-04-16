import { useQuery } from 'react-query';
import dashboardService from '../services/dashboardService';

// Hook for owner dashboard
export const useOwnerDashboard = (params = {}) => {
  return useQuery({
    queryKey: ['ownerDashboard', params],
    queryFn: () => dashboardService.getOwnerDashboard(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for driver dashboard
export const useDriverDashboard = (params = {}) => {
  return useQuery({
    queryKey: ['driverDashboard', params],
    queryFn: () => dashboardService.getDriverDashboard(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for daily summary
export const useDailySummary = (params = {}) => {
  return useQuery({
    queryKey: ['dailySummary', params],
    queryFn: () => dashboardService.getDailySummary(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Hook for monthly report
export const useMonthlyReport = (params = {}) => {
  return useQuery({
    queryKey: ['monthlyReport', params],
    queryFn: () => dashboardService.getMonthlyReport(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
