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

  const updateVehicleMutation = useMutation({
    mutationFn: ({ vehicleId, data }) => vehicleService.updateVehicle(vehicleId, data),
    onSuccess: () => {
      toast.success('Vehicle updated successfully');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update vehicle');
    },
  });

  const createDriverMutation = useMutation({
    mutationFn: ({ vehicleId, data }) => vehicleService.createDriver(vehicleId, data),
    onSuccess: () => {
      toast.success('Driver created and assigned');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create driver');
    },
  });

  const updateDriverLoginMutation = useMutation({
    mutationFn: ({ vehicleId, data }) => vehicleService.updateDriverLogin(vehicleId, data),
    onSuccess: () => {
      toast.success('Driver login updated');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update driver login');
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: (data) => vehicleService.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create vendor');
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (vehicleId) => vehicleService.deleteVehicle(vehicleId),
    onSuccess: () => {
      toast.success('Vehicle deleted');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete vehicle');
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
    updateVehicle: updateVehicleMutation.mutate,
    isUpdating: updateVehicleMutation.isLoading,
    createDriver: createDriverMutation.mutate,
    isCreatingDriver: createDriverMutation.isLoading,
    updateDriverLogin: updateDriverLoginMutation.mutate,
    isUpdatingDriverLogin: updateDriverLoginMutation.isLoading,
    createVendorAsync: createVendorMutation.mutateAsync,
    isCreatingVendor: createVendorMutation.isLoading,
    deleteVehicle: deleteVehicleMutation.mutate,
    isDeleting: deleteVehicleMutation.isLoading,
  };
};
