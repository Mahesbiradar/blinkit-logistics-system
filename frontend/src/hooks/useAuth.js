import { useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import authService from '../services/authService';

const TEMP_TOKEN_KEY = 'temp_token';
const OTP_PHONE_KEY = 'otp_phone';

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAuth, clearAuth, getHomeRoute } = useAuthStore();

  const sendOTPMutation = useMutation({
    mutationFn: authService.sendOTP,
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: authService.verifyOTP,
    onSuccess: (response) => {
      const { user, tokens, driver_profile, is_new_user, temp_token } = response.data.data;

      if (is_new_user) {
        sessionStorage.setItem(TEMP_TOKEN_KEY, temp_token);
        navigate('/driver/register');
        return;
      }

      sessionStorage.removeItem(TEMP_TOKEN_KEY);
      sessionStorage.removeItem(OTP_PHONE_KEY);
      setAuth(user, tokens, driver_profile);
      toast.success('Login successful');
      navigate(getHomeRoute());
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({ data, tempToken }) => authService.registerDriver(data, tempToken),
    onSuccess: (response) => {
      const { user, tokens, driver_profile } = response.data.data;
      setAuth(user, tokens, driver_profile || null);
      sessionStorage.removeItem(TEMP_TOKEN_KEY);
      sessionStorage.removeItem(OTP_PHONE_KEY);
      toast.success('Registration successful');
      navigate('/driver/dashboard');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => authService.login(email, password),
    onSuccess: (response) => {
      const { user, tokens } = response.data.data;
      setAuth(user, tokens);
      toast.success('Login successful');
      navigate(user.role === 'driver' ? '/driver/dashboard' : '/admin/dashboard');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: authService.forgotPassword,
    onSuccess: (response) => {
      const phone = response.data.data?.phone;
      if (phone) {
        sessionStorage.setItem(OTP_PHONE_KEY, phone);
      }
      toast.success(response.data?.message || 'Password reset OTP sent');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send reset OTP');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: (response) => {
      sessionStorage.removeItem(OTP_PHONE_KEY);
      toast.success(response.data?.message || 'Password reset successful');
      navigate('/login');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  const createCoordinatorMutation = useMutation({
    mutationFn: authService.createCoordinator,
    onSuccess: () => {
      toast.success('Coordinator created successfully');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create coordinator');
    },
  });

  const logout = () => {
    clearAuth();
    queryClient.clear();
    sessionStorage.removeItem(TEMP_TOKEN_KEY);
    sessionStorage.removeItem(OTP_PHONE_KEY);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return {
    sendOTP: sendOTPMutation.mutate,
    verifyOTP: verifyOTPMutation.mutate,
    registerDriver: registerMutation.mutate,
    login: loginMutation.mutate,
    forgotPassword: forgotPasswordMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,
    createCoordinator: createCoordinatorMutation.mutate,
    logout,
    isLoading:
      sendOTPMutation.isLoading ||
      verifyOTPMutation.isLoading ||
      registerMutation.isLoading ||
      loginMutation.isLoading ||
      forgotPasswordMutation.isLoading ||
      resetPasswordMutation.isLoading ||
      createCoordinatorMutation.isLoading,
    isCreatingCoordinator: createCoordinatorMutation.isLoading,
    error:
      sendOTPMutation.error ||
      verifyOTPMutation.error ||
      registerMutation.error ||
      loginMutation.error ||
      forgotPasswordMutation.error ||
      resetPasswordMutation.error ||
      createCoordinatorMutation.error,
  };
};
