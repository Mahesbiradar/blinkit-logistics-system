import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import paymentService from '../services/paymentService';

export const usePayments = (params = {}) =>
  useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentService.getPayments(params),
  });

export const usePaymentActions = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: paymentService.createPayment,
    onSuccess: () => {
      toast.success('Payment created successfully');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create payment');
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, ...data }) => paymentService.markPaid(id, data),
    onSuccess: () => {
      toast.success('Payment marked as paid');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to mark payment as paid');
    },
  });

  const calculateMutation = useMutation({
    mutationFn: paymentService.calculatePayment,
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to calculate payment');
    },
  });

  return {
    createPayment: createMutation.mutate,
    isCreating: createMutation.isLoading,
    markPaid: markPaidMutation.mutate,
    isMarkingPaid: markPaidMutation.isLoading,
    calculatePayment: calculateMutation.mutateAsync,
    isCalculating: calculateMutation.isLoading,
  };
};
