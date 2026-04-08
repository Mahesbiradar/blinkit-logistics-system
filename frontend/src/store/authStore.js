import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      tokens: null,
      isAuthenticated: false,
      driverProfile: null,

      // Actions
      setAuth: (user, tokens, driverProfile = null) =>
        set({
          user,
          tokens,
          driverProfile,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          tokens: null,
          driverProfile: null,
          isAuthenticated: false,
        }),

      updateTokens: (tokens) =>
        set({
          tokens: { ...get().tokens, ...tokens },
        }),

      updateUser: (userData) =>
        set({
          user: { ...get().user, ...userData },
        }),

      // Getters
      getAccessToken: () => get().tokens?.access,
      getRefreshToken: () => get().tokens?.refresh,

      // Role checks
      isOwner: () => get().user?.role === 'owner',
      isCoordinator: () => get().user?.role === 'coordinator',
      isDriver: () => get().user?.role === 'driver',

      // Helper to check if user has permission
      hasPermission: (requiredRole) => {
        const userRole = get().user?.role;
        if (requiredRole === 'owner') return userRole === 'owner';
        if (requiredRole === 'coordinator')
          return userRole === 'owner' || userRole === 'coordinator';
        if (requiredRole === 'driver') return userRole === 'driver';
        return false;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        driverProfile: state.driverProfile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
