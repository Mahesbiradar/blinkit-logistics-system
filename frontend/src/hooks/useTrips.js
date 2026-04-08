import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import tripService from '../services/tripService';

// Hook for fetching trips
export const useTrips = (params = {}) => {
  const queryClient = useQueryClient();

  // Get all trips (admin/coordinator)
  const tripsQuery = useQuery({
    queryKey: ['trips', params],
    queryFn: () => tripService.getTrips(params),
    enabled: !params.myTrips, // Only fetch if not fetching my trips
  });

  // Get my trips (driver)
  const myTripsQuery = useQuery({
    queryKey: ['myTrips', params],
    queryFn: () => tripService.getMyTrips(params),
    enabled: params.myTrips,
  });

  // Get pending trips
  const pendingTripsQuery = useQuery({
    queryKey: ['pendingTrips'],
    queryFn: () => tripService.getPendingTrips(),
  });

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: tripService.createTrip,
    onSuccess: () => {
      toast.success('Trip created successfully!');
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['myTrips'] });
      queryClient.invalidateQueries({ queryKey: ['driverDashboard'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create trip');
    },
  });

  // Approve trip mutation
  const approveTripMutation = useMutation({
    mutationFn: ({ tripId, remarks }) => tripService.approveTrip(tripId, remarks),
    onSuccess: () => {
      toast.success('Trip approved!');
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve trip');
    },
  });

  // Reject trip mutation
  const rejectTripMutation = useMutation({
    mutationFn: ({ tripId, reason }) => tripService.rejectTrip(tripId, reason),
    onSuccess: () => {
      toast.success('Trip rejected!');
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['pendingTrips'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reject trip');
    },
  });

  return {
    // Queries
    trips: tripsQuery.data?.data?.data?.trips || [],
    myTrips: myTripsQuery.data?.data?.data?.trips || [],
    pendingTrips: pendingTripsQuery.data?.data?.data?.trips || [],
    summary: myTripsQuery.data?.data?.data?.summary || {},
    
    // Loading states
    isLoading: tripsQuery.isLoading || myTripsQuery.isLoading,
    isPendingLoading: pendingTripsQuery.isLoading,
    
    // Mutations
    createTrip: createTripMutation.mutate,
    approveTrip: approveTripMutation.mutate,
    rejectTrip: rejectTripMutation.mutate,
    
    // Mutation loading states
    isCreating: createTripMutation.isLoading,
    isApproving: approveTripMutation.isLoading,
    isRejecting: rejectTripMutation.isLoading,
    
    // Refetch
    refetch: tripsQuery.refetch,
    refetchPending: pendingTripsQuery.refetch,
  };
};

// Hook for trip stats
export const useTripStats = (params = {}) => {
  return useQuery({
    queryKey: ['tripStats', params],
    queryFn: () => tripService.getTripStats(params),
  });
};
