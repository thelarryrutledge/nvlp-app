import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStore, User } from '@/types/store';
import { useAuthStore } from './authStore';

// Initial state
const initialState = {
  profile: null,
  preferences: {
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    notifications: true,
    biometricAuth: false,
  },
  isLoading: false,
  error: null,
};

// Create the user store with persistence
export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Profile actions
      loadProfile: async () => {
        set({ isLoading: true, error: null });

        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No authentication token available');
          }

          // TODO: Replace with actual NVLP API call
          const response = await fetch('https://edge-api.nvlp.app/api/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load profile');
          }

          const profile = await response.json();
          
          set({
            profile,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load profile',
          });
          throw error;
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        const { profile } = get();
        if (!profile) {
          throw new Error('No profile loaded');
        }

        set({ isLoading: true, error: null });

        try {
          const token = useAuthStore.getState().token;
          if (!token) {
            throw new Error('No authentication token available');
          }

          // TODO: Replace with actual NVLP API call
          const response = await fetch('https://edge-api.nvlp.app/api/profile', {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error('Failed to update profile');
          }

          const updatedProfile = await response.json();
          
          set({
            profile: updatedProfile,
            isLoading: false,
            error: null,
          });

          // Also update the user in auth store if it's the same user
          const authUser = useAuthStore.getState().user;
          if (authUser && authUser.id === updatedProfile.id) {
            useAuthStore.getState().setUser(updatedProfile);
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update profile',
          });
          throw error;
        }
      },

      updatePreferences: (preferences: Partial<typeof initialState.preferences>) => {
        const currentPreferences = get().preferences;
        set({
          preferences: {
            ...currentPreferences,
            ...preferences,
          },
        });
      },

      // State setters
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'nvlp-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist profile and preferences
      partialize: (state) => ({
        profile: state.profile,
        preferences: state.preferences,
      }),
    }
  )
);

// Selectors for common use cases
export const userSelectors = {
  profile: () => useUserStore((state) => state.profile),
  preferences: () => useUserStore((state) => state.preferences),
  currency: () => useUserStore((state) => state.preferences.currency),
  dateFormat: () => useUserStore((state) => state.preferences.dateFormat),
  notifications: () => useUserStore((state) => state.preferences.notifications),
  biometricAuth: () => useUserStore((state) => state.preferences.biometricAuth),
  isLoading: () => useUserStore((state) => state.isLoading),
  error: () => useUserStore((state) => state.error),
};

// Computed selectors
export const userComputedSelectors = {
  fullName: () => useUserStore((state) => {
    const { profile } = state;
    if (!profile) return null;
    
    const { firstName, lastName } = profile;
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || profile.email;
  }),
  
  initials: () => useUserStore((state) => {
    const { profile } = state;
    if (!profile) return '';
    
    const { firstName, lastName } = profile;
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (lastName) {
      return lastName[0].toUpperCase();
    }
    return profile.email[0].toUpperCase();
  }),
};