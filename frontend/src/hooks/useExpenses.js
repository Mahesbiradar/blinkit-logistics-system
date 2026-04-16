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

  return {
    createExpense: createExpenseMutation.mutate,
    isCreating: createExpenseMutation.isLoading,
  };
};
