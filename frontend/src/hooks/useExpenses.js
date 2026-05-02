import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import expenseService from '../services/expenseService';

export const useMyExpenses = (params = {}) =>
  useQuery({
    queryKey: ['myExpenses', params],
    queryFn: () => expenseService.getMyExpenses(params),
  });

export const useExpenses = (params = {}) =>
  useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expenseService.getExpenses(params),
  });

export const useExpenseSummary = (params = {}) =>
  useQuery({
    queryKey: ['expense-summary', params],
    queryFn: () => expenseService.getExpenseSummary(params),
  });

export const useFastagRecords = (params = {}) =>
  useQuery({
    queryKey: ['fastag-records', params],
    queryFn: () => expenseService.getFastagRecords(params),
  });

export const useCompanyExpenses = (params = {}) =>
  useQuery({
    queryKey: ['company-expenses', params],
    queryFn: () => expenseService.getCompanyExpenses(params),
  });

export const useCompanyExpenseSummary = (params = {}) =>
  useQuery({
    queryKey: ['company-expense-summary', params],
    queryFn: () => expenseService.getCompanyExpenseSummary(params),
  });

export const useExpenseActions = () => {
  const queryClient = useQueryClient();

  const createExpenseMutation = useMutation({
    mutationFn: expenseService.createExpense,
    onSuccess: () => {
      toast.success('Expense recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      queryClient.invalidateQueries({ queryKey: ['myExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['driverDashboard'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record expense');
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ expenseId, data }) => expenseService.updateExpense(expenseId, data),
    onSuccess: () => {
      toast.success('Expense updated');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      queryClient.invalidateQueries({ queryKey: ['myExpenses'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update expense');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId) => expenseService.deleteExpense(expenseId),
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      queryClient.invalidateQueries({ queryKey: ['myExpenses'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete expense');
    },
  });

  return {
    createExpense: createExpenseMutation.mutate,
    isCreating: createExpenseMutation.isLoading,
    updateExpense: updateExpenseMutation.mutate,
    isUpdating: updateExpenseMutation.isLoading,
    deleteExpense: deleteExpenseMutation.mutate,
    isDeleting: deleteExpenseMutation.isLoading,
  };
};

export const useFastagActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fastag-records'] });

  const createMutation = useMutation({
    mutationFn: expenseService.createFastagRecord,
    onSuccess: () => {
      toast.success('Fastag record created');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to create Fastag record'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => expenseService.updateFastagRecord(id, data),
    onSuccess: () => {
      toast.success('Fastag statement updated');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update Fastag record'),
  });

  const refreshMutation = useMutation({
    mutationFn: expenseService.refreshFastagRecharge,
    onSuccess: () => {
      toast.success('Recharge amount refreshed');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to refresh Fastag recharge'),
  });

  const closeMutation = useMutation({
    mutationFn: expenseService.markFastagClosed,
    onSuccess: () => {
      toast.success('Fastag record closed');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to close Fastag record'),
  });

  const reopenMutation = useMutation({
    mutationFn: expenseService.reopenFastag,
    onSuccess: () => {
      toast.success('Fastag record reopened');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to reopen Fastag record'),
  });

  return {
    createFastagRecord: createMutation.mutate,
    updateFastagRecord: updateMutation.mutate,
    refreshFastagRecharge: refreshMutation.mutate,
    markFastagClosed: closeMutation.mutate,
    reopenFastag: reopenMutation.mutate,
    isCreatingFastag: createMutation.isLoading,
    isUpdatingFastag: updateMutation.isLoading,
    isRefreshingFastag: refreshMutation.isLoading,
    isClosingFastag: closeMutation.isLoading,
    isReopeningFastag: reopenMutation.isLoading,
  };
};

export const useCompanyExpenseActions = () => {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['company-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['company-expense-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: expenseService.createCompanyExpense,
    onSuccess: () => {
      toast.success('Company expense recorded');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to record company expense'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => expenseService.updateCompanyExpense(id, data),
    onSuccess: () => {
      toast.success('Company expense updated');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update company expense'),
  });

  const deleteMutation = useMutation({
    mutationFn: expenseService.deleteCompanyExpense,
    onSuccess: () => {
      toast.success('Company expense deleted');
      invalidate();
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete company expense'),
  });

  return {
    createCompanyExpense: createMutation.mutate,
    updateCompanyExpense: updateMutation.mutate,
    deleteCompanyExpense: deleteMutation.mutate,
    isCreatingCompanyExpense: createMutation.isLoading,
    isUpdatingCompanyExpense: updateMutation.isLoading,
    isDeletingCompanyExpense: deleteMutation.isLoading,
  };
};
