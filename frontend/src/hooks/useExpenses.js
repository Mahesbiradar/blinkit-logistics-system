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

export const useExpenseActions = () => {
  const queryClient = useQueryClient();

  const createExpenseMutation = useMutation({
    mutationFn: expenseService.createExpense,
    onSuccess: () => {
      toast.success('Expense recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
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
