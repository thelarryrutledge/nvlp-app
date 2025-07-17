import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthStore, User } from '@/types/store';

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  error: null,
};

// Create the authentication store with persistence
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Authentication actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // TODO: Replace with actual NVLP API call
          const response = await fetch('https://edge-api.nvlp.app/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            throw new Error('Login failed');
          }

          const data = await response.json();
          const { user, access_token, refresh_token } = data;

          set({
            isAuthenticated: true,
            user,
            token: access_token,
            refreshToken: refresh_token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          const { token } = get();
          
          // TODO: Replace with actual NVLP API call for logout
          if (token) {
            await fetch('https://edge-api.nvlp.app/auth/logout', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
          }
        } catch (error) {
          console.warn('Logout API call failed:', error);
        } finally {
          // Always clear local state regardless of API response
          set({
            ...initialState,
            isLoading: false,
          });
        }
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        set({ isLoading: true, error: null });

        try {
          // TODO: Replace with actual NVLP API call
          const response = await fetch('https://edge-api.nvlp.app/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          const { access_token, refresh_token } = data;

          set({
            token: access_token,
            refreshToken: refresh_token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // If refresh fails, logout the user
          set({
            ...initialState,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Token refresh failed',
          });
          throw error;
        }
      },

      // Direct state setters
      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string, refreshToken: string) => {
        set({ 
          token, 
          refreshToken,
          isAuthenticated: true,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'nvlp-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist critical auth data
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// Selectors for common use cases
export const authSelectors = {
  isAuthenticated: () => useAuthStore((state) => state.isAuthenticated),
  user: () => useAuthStore((state) => state.user),
  token: () => useAuthStore((state) => state.token),
  isLoading: () => useAuthStore((state) => state.isLoading),
  error: () => useAuthStore((state) => state.error),
};