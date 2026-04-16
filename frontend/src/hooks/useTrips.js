import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import tripService from '../services/tripService';

const extractTrips = (response) => response?.data?.data?.trips || [];
const extractSummary = (response) => response?.data?.data?.summary || {};

export const useTrips = (params = {}) => {
  const queryClient = useQueryClient();

  const tripsQuery = useQuery({
    queryKey: ['trips', params],
    queryFn: () => tripService.getTrips(params),
  });

  const pendingTripsQuery = useQuery({
    queryKey: ['pendingTrips'],
    queryFn: () => tripService.getPendingTrips(),
  });

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
    trips: extractTrips(tripsQuery.data),
    pendingTrips: extractTrips(pendingTripsQuery.data),
    summary: extractSummary(tripsQuery.data),
    isPendingLoading: pendingTripsQuery.isLoading,
    isLoading: tripsQuery.isLoading,
    createTrip: createTripMutation.mutate,
    approveTrip: approveTripMutation.mutate,
    rejectTrip: rejectTripMutation.mutate,
    isCreating: createTripMutation.isLoading,
    isApproving: approveTripMutation.isLoading,
    isRejecting: rejectTripMutation.isLoading,
    refetch: tripsQuery.refetch,
    refetchPending: pendingTripsQuery.refetch,
  };
};

export const useMyTrips = (params = {}) => {
  const myTripsQuery = useQuery({
    queryKey: ['myTrips', params],
    queryFn: () => tripService.getMyTrips(params),
  });

  return {
    myTrips: extractTrips(myTripsQuery.data),
    summary: extractSummary(myTripsQuery.data),
    isLoading: myTripsQuery.isLoading,
    refetch: myTripsQuery.refetch,
  };
};

export const useCreateTrip = () => {
  const queryClient = useQueryClient();

  const createTripMutation = useMutation({
    mutationFn: tripService.createTrip,
    onSuccess: () => {
      toast.success('Trip created successfully!');
      queryClient.invalidateQueries({ queryKey: ['myTrips'] });
      queryClient.invalidateQueries({ queryKey: ['driverDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tripStats'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create trip');
    },
  });

  return {
    createTrip: createTripMutation.mutate,
    isCreating: createTripMutation.isLoading,
  };
};

export const useTripStats = (params = {}) => {
  return useQuery({
    queryKey: ['tripStats', params],
    queryFn: () => tripService.getTripStats(params),
  });
};
