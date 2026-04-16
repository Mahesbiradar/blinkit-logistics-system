import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import driverService from '../services/driverService';

export const useDrivers = (params = {}) => {
  const queryClient = useQueryClient();

  const driversQuery = useQuery({
    queryKey: ['drivers', params],
    queryFn: () => driverService.getDrivers(params),
  });

  const createDriverMutation = useMutation({
    mutationFn: driverService.createDriver,
    onSuccess: () => {
      toast.success('Driver created successfully');
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create driver');
    },
  });

  return {
    drivers: driversQuery.data?.data?.data?.drivers || [],
    meta: driversQuery.data?.data?.meta || {},
    isLoading: driversQuery.isLoading,
    isError: driversQuery.isError,
    error: driversQuery.error,
    refetch: driversQuery.refetch,
    createDriver: createDriverMutation.mutate,
    isCreating: createDriverMutation.isLoading,
  };
};
