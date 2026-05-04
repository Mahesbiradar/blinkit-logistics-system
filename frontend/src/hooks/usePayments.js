import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import paymentService from '../services/paymentService';
import { getErrorMessage } from '../utils/apiError';

export const usePayments = (params = {}) =>
  useQuery({
    queryKey: ['settlements', params],
    queryFn: () => paymentService.getSettlements(params),
  });

export const useSettlements = usePayments;

export const useSettlementSummary = (params = {}) =>
  useQuery({
    queryKey: ['settlement-summary', params],
    queryFn: () => paymentService.getSettlementSummary(params),
    enabled: Boolean(params?.month_year),
  });

export const useVehicleCarryForward = (vehicleId) =>
  useQuery({
    queryKey: ['carry-forward', vehicleId],
    queryFn: () => paymentService.getCarryForward({ vehicle_id: vehicleId }),
    enabled: !!vehicleId,
    staleTime: 5 * 60 * 1000,
  });

export const useCalculateSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentService.calculateSettlement,
    onSuccess: () => {
      toast.success('Settlement calculated');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-summary'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to calculate settlement')),
  });
};

export const useFinalizeSettlement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentService.finalizeSettlement,
    onSuccess: () => {
      toast.success('Settlement finalized');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-summary'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to finalize settlement')),
  });
};

export const useMarkPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => paymentService.markPaid(id, data),
    onSuccess: () => {
      toast.success('Settlement marked as paid');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-summary'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to mark settlement as paid')),
  });
};

export const usePaymentActions = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: paymentService.createPayment,
    onSuccess: () => {
      toast.success('Settlement created successfully');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to create settlement'));
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, ...data }) => paymentService.markPaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to mark settlement as paid'));
    },
  });

  const calculateMutation = useMutation({
    mutationFn: paymentService.calculateSettlement,
    onSuccess: () => {
      toast.success('Settlement calculated');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to calculate settlement'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => paymentService.updateSettlement(id, data),
    onSuccess: () => {
      toast.success('Settlement updated');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to update settlement'));
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: paymentService.finalizeSettlement,
    onSuccess: () => {
      toast.success('Settlement finalized');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to finalize settlement'));
    },
  });

  const reopenMutation = useMutation({
    mutationFn: paymentService.reopenSettlement,
    onSuccess: () => {
      toast.success('Settlement reopened');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to reopen settlement'));
    },
  });

  const recalculateFromTripsMutation = useMutation({
    mutationFn: paymentService.recalculateFromTrips,
    onSuccess: () => {
      toast.success('Recalculated from approved trips');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to recalculate from trips'));
    },
  });

  return {
    createPayment: createMutation.mutate,
    createSettlement: createMutation.mutate,
    isCreating: createMutation.isLoading,
    updateSettlement: updateMutation.mutate,
    isUpdating: updateMutation.isLoading,
    markPaid: markPaidMutation.mutate,
    markPaidAsync: markPaidMutation.mutateAsync,
    isMarkingPaid: markPaidMutation.isLoading,
    markPaidData: markPaidMutation.data,
    calculatePayment: calculateMutation.mutateAsync,
    calculateSettlement: calculateMutation.mutate,
    isCalculating: calculateMutation.isLoading,
    finalizeSettlement: finalizeMutation.mutate,
    isFinalizing: finalizeMutation.isLoading,
    reopenSettlement: reopenMutation.mutate,
    isReopening: reopenMutation.isLoading,
    recalculateFromTrips: recalculateFromTripsMutation.mutate,
    isRecalculating: recalculateFromTripsMutation.isLoading,
  };
};
