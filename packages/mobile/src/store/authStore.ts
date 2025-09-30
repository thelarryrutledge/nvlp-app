import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageService, { AuthTokens } from '../services/secureStorage';
import { validateJWTForSecurity } from '../utils/jwt';
import DeviceService from '../services/deviceService';
import ApiClientService from '../services/apiClient';
import { getDeviceId, getDeviceInfo } from '../utils/device';
import supabaseClient from '../services/supabaseClient';

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  
  // Getters for tokens (don't store in state for security)
  getAccessToken: () => Promise<string | null>;
  hasValidTokens: () => Promise<boolean>;
  
  // Session invalidation handling
  handleSessionInvalidated: (errorMessage: string) => Promise<void>;
}


const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      console.log('🏪 AuthStore: Creating store instance');
      
      return {
        // Initial state
        isAuthenticated: false,
        isLoading: false,
        isInitialized: false,
        error: null,

        // Initialize auth state from secure storage (called on app startup)
        initialize: async () => {
          const { isInitialized } = get();
          if (isInitialized) {
            console.log('🔐 AuthStore: Already initialized, skipping...');
            return;
          }

          console.log('🔐 AuthStore: Starting initialization...');
          set({ isLoading: true, error: null });
          
          try {
            // Check for stored tokens
            const tokens = await SecureStorageService.getAuthTokens();
            
            if (tokens) {
              console.log('✅ AuthStore: Found stored tokens, user is authenticated');
              await SecureStorageService.updateLastActivity();
              
              set({
                isAuthenticated: true,
                isInitialized: true,
                isLoading: false,
                error: null,
              });
            } else {
              console.log('🔐 AuthStore: No stored tokens - user needs to sign in');
              set({
                isAuthenticated: false,
                isInitialized: true,
                isLoading: false,
                error: null,
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth';
            console.error('❌ AuthStore: Failed to initialize:', error);
            
            set({
              isAuthenticated: false,
              isInitialized: true,
              isLoading: false,
              error: errorMessage,
            });
          }
        },

      // Sign up with email/password
      signUpWithEmailPassword: async (email: string, password: string) => {
        console.log('🔑 AuthStore: Starting email/password signup...');
        set({ isLoading: true, error: null });
        
        try {
          const deviceId = await getDeviceId();
          const deviceInfo = await getDeviceInfo();
          
          console.log('📦 AuthStore: Calling signup with:', {
            action: 'signup',
            email,
            deviceId,
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
          });
          
          const { data, error } = await supabaseClient.functions.invoke('auth-password', {
            body: {
              action: 'signup',
              email,
              password,
              deviceId,
              deviceName: deviceInfo.deviceName,
              deviceType: deviceInfo.deviceType,
            },
          });

          console.log('📥 AuthStore: Signup response:', { data, error });

          if (error) {
            console.error('❌ AuthStore: Edge function error details:', {
              message: error.message,
              context: error.context,
              details: error.details,
              status: error.status,
              code: error.code,
              fullError: JSON.stringify(error)
            });
            throw new Error(error.message || 'Sign up failed');
          }

          if (data?.error) {
            console.error('❌ AuthStore: API error:', data.error);
            throw new Error(data.error || 'Sign up failed');
          }

          console.log('✅ AuthStore: Sign up successful');
          set({
            isLoading: false,
            error: null,
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
          console.error('❌ AuthStore: Sign up failed:', error);
          
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Sign in with email/password
      signInWithEmailPassword: async (email: string, password: string) => {
        console.log('🔑 AuthStore: Starting email/password signin...');
        set({ isLoading: true, error: null });
        
        try {
          const deviceId = await getDeviceId();
          const deviceInfo = await getDeviceInfo();
          
          const { data, error } = await supabaseClient.functions.invoke('auth-password', {
            body: {
              action: 'signin',
              email,
              password,
              deviceId,
              deviceName: deviceInfo.deviceName,
              deviceType: deviceInfo.deviceType,
            },
          });

          if (error) {
            throw new Error(error.message || 'Sign in failed');
          }

          if (!data?.session) {
            throw new Error(data?.error || 'Sign in failed - no session returned');
          }

          // Validate the access token for security
          console.log('🔒 AuthStore: Validating JWT token security...');
          const jwtValidation = validateJWTForSecurity(data.session.access_token);
          
          if (!jwtValidation.isValid) {
            console.error('❌ AuthStore: JWT validation failed:', jwtValidation.reason);
            throw new Error(`Security validation failed: ${jwtValidation.reason}`);
          }
          
          console.log('✅ AuthStore: JWT token is valid');

          // Store the tokens
          const authTokens: AuthTokens = {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            userId: data.user.id,
            expiresAt: data.session.expires_at,
            lastActivity: Date.now(),
          };
          
          console.log('💾 AuthStore: Storing auth tokens...');
          await SecureStorageService.setAuthTokens(authTokens);
          
          // Initialize API client
          console.log('🔧 AuthStore: Initializing API client...');
          await ApiClientService.initialize();
          
          set({
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false,
            error: null,
          });
          
          console.log('✅ AuthStore: Sign in successful');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
          console.error('❌ AuthStore: Sign in failed:', error);
          
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // Sign out
      signOut: async () => {
        console.log('🚪 AuthStore: Starting sign out...');
        set({ isLoading: true, error: null });
        
        try {
          // Call the signout API endpoint
          const tokens = await SecureStorageService.getAuthTokens();
          if (tokens?.accessToken) {
            try {
              await supabaseClient.functions.invoke('auth-password', {
                body: {
                  action: 'signout',
                },
                headers: {
                  'Authorization': `Bearer ${tokens.accessToken}`,
                },
              });
            } catch (error) {
              console.warn('⚠️ AuthStore: API signout call failed (continuing with local cleanup):', error);
            }
          }
          
          // Clear known devices list
          await DeviceService.clearKnownDevices();
          
          // Clear secure storage
          await SecureStorageService.clearAuthTokens();
          
          // Clear state
          set({
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          console.log('✅ AuthStore: Sign out successful');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
          console.error('❌ AuthStore: Sign out failed:', error);
          
          // Clear state anyway for security
          set({
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      // Get access token for API calls
      getAccessToken: async (): Promise<string | null> => {
        try {
          const tokens = await SecureStorageService.getAuthTokens();
          return tokens?.accessToken || null;
        } catch (error) {
          console.error('Failed to get access token:', error);
          return null;
        }
      },

      // Check if user has valid tokens
      hasValidTokens: async (): Promise<boolean> => {
        try {
          const tokens = await SecureStorageService.getAuthTokens();
          return tokens !== null;
        } catch (error) {
          console.error('Failed to check valid tokens:', error);
          return false;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
      
      // Handle session invalidation from API
      handleSessionInvalidated: async (errorMessage: string) => {
          console.log('🚨 AuthStore: Handling session invalidation:', errorMessage);
          
          try {
            // Clear all secure storage (auth tokens and device info)
            await SecureStorageService.clearAll();
            
            // Update state to logged out
            set({
              isAuthenticated: false,
              isLoading: false,
              error: `Session ended: ${errorMessage}`,
            });
            
            console.log('✅ AuthStore: Session invalidation handled successfully');
          } catch (error) {
            console.error('❌ AuthStore: Error handling session invalidation:', error);
            
            // Force logout state even if cleanup fails
            set({
              isAuthenticated: false,
              isLoading: false,
              error: 'Session ended due to security policy',
            });
          }
        },
      };
    },
    {
      name: 'nvlp-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist authentication status, not initialization state
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;