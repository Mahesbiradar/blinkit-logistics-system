import { useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import authService from '../services/authService';

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAuth, clearAuth } = useAuthStore();

  // Send OTP mutation
  const sendOTPMutation = useMutation({
    mutationFn: authService.sendOTP,
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    },
  });

  // Verify OTP mutation
  const verifyOTPMutation = useMutation({
    mutationFn: authService.verifyOTP,
    onSuccess: (response) => {
      const { user, tokens, driver_profile, is_new_user } = response.data.data;

      if (is_new_user) {
        // Store temp token and redirect to registration
        localStorage.setItem('temp_token', response.data.data.temp_token);
        navigate('/driver/register');
      } else {
        setAuth(user, tokens, driver_profile);
        toast.success('Login successful!');
        navigate('/driver/dashboard');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    },
  });

  // Driver registration mutation
  const registerMutation = useMutation({
    mutationFn: ({ data, tempToken }) => authService.registerDriver(data, tempToken),
    onSuccess: (response) => {
      const { user, tokens } = response.data.data;
      setAuth(user, tokens);
      localStorage.removeItem('temp_token');
      toast.success('Registration successful!');
      navigate('/driver/dashboard');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
  });

  // Admin/Coordinator login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => authService.login(email, password),
    onSuccess: (response) => {
      const { user, tokens } = response.data.data;
      setAuth(user, tokens);
      toast.success('Login successful!');
      navigate('/admin/dashboard');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    },
  });

  // Logout function
  const logout = () => {
    clearAuth();
    queryClient.clear();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return {
    // Actions
    sendOTP: sendOTPMutation.mutate,
    verifyOTP: verifyOTPMutation.mutate,
    registerDriver: registerMutation.mutate,
    login: loginMutation.mutate,
    logout,

    // Loading states
    isLoading:
      sendOTPMutation.isLoading ||
      verifyOTPMutation.isLoading ||
      registerMutation.isLoading ||
      loginMutation.isLoading,

    // Error states
    error:
      sendOTPMutation.error ||
      verifyOTPMutation.error ||
      registerMutation.error ||
      loginMutation.error,
  };
};
