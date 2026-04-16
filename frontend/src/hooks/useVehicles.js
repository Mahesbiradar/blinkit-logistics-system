import { useMutation, useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import vehicleService from '../services/vehicleService';

export const useVehicles = (params = {}) => {
  const queryClient = useQueryClient();

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleService.getVehicles(params),
  });

  const vendorsQuery = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vehicleService.getVendors(),
  });

  const createVehicleMutation = useMutation({
    mutationFn: vehicleService.createVehicle,
    onSuccess: () => {
      toast.success('Vehicle created successfully');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create vehicle');
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: ({ vehicleId, data }) => vehicleService.assignDriver(vehicleId, data),
    onSuccess: () => {
      toast.success('Driver assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign driver');
    },
  });

  return {
    vehicles: vehiclesQuery.data?.data?.data?.vehicles || [],
    vendors: vendorsQuery.data?.data?.data?.vendors || [],
    meta: vehiclesQuery.data?.data?.meta || {},
    isLoading: vehiclesQuery.isLoading,
    isError: vehiclesQuery.isError,
    error: vehiclesQuery.error,
    refetch: vehiclesQuery.refetch,
    createVehicle: createVehicleMutation.mutate,
    isCreating: createVehicleMutation.isLoading,
    assignDriver: assignDriverMutation.mutate,
    isAssigning: assignDriverMutation.isLoading,
  };
};
