import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageService, { AuthTokens } from '../services/secureStorage';
import { MagicLinkData } from '../services/deepLinkService';
import { validateJWTForSecurity } from '../utils/jwt';
import DeviceService from '../services/deviceService';
import ApiClientService from '../services/apiClient';

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  signInWithMagicLink: (magicLinkData: MagicLinkData) => Promise<void>;
  signOut: () => Promise<void>;
  updateActivity: () => Promise<void>;
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

      // Initialize auth state from secure storage
      initialize: async () => {
        const { isInitialized } = get();
        if (isInitialized) {
          console.log('🔐 AuthStore: Already initialized, skipping...');
          return;
        }

        console.log('🔐 AuthStore: Starting initialization...');
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔐 AuthStore: Checking for cached tokens...');
          
          // Check if we have valid cached tokens
          const tokens = await SecureStorageService.getAuthTokens();
          const hasValidTokens = tokens !== null;
          
          console.log('🔐 AuthStore: Token check result:', { hasValidTokens, tokens: tokens ? 'found' : 'none' });
          
          if (hasValidTokens) {
            console.log('✅ AuthStore: Valid tokens found - user is authenticated');
            // Update activity timestamp since app is opening
            await SecureStorageService.updateLastActivity();
          } else {
            console.log('🔐 AuthStore: No valid tokens found - user needs to sign in');
          }
          
          set({
            isAuthenticated: hasValidTokens,
            isInitialized: true,
            isLoading: false,
            error: null,
          });
          
          console.log('✅ AuthStore: Initialization complete, isAuthenticated:', hasValidTokens);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth';
          console.error('❌ AuthStore: Failed to initialize:', error);
          
          set({
            isInitialized: true,
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
        }
      },

      // Sign in with magic link
      signInWithMagicLink: async (magicLinkData: MagicLinkData) => {
        console.log('🔑 AuthStore: Starting magic link authentication...', {
          hasAccessToken: !!magicLinkData.access_token,
          hasRefreshToken: !!magicLinkData.refresh_token,
          expiresIn: magicLinkData.expires_in
        });
        set({ isLoading: true, error: null });
        
        try {
          if (!magicLinkData.access_token || !magicLinkData.refresh_token) {
            throw new Error('Invalid magic link data - missing tokens');
          }
          
          // Validate the access token for security
          console.log('🔒 AuthStore: Validating JWT token security...');
          const jwtValidation = validateJWTForSecurity(magicLinkData.access_token);
          
          if (!jwtValidation.isValid) {
            console.error('❌ AuthStore: JWT validation failed:', jwtValidation.reason);
            throw new Error(`Security validation failed: ${jwtValidation.reason}`);
          }
          
          console.log('✅ AuthStore: JWT token is valid and not expired');
          
          // Store tokens securely with current timestamp as lastActivity
          const expiresAtValue = magicLinkData.expires_at ? parseInt(magicLinkData.expires_at, 10) : undefined;
          console.log('🔐 AuthStore: Parsing expires_at:', {
            raw: magicLinkData.expires_at,
            parsed: expiresAtValue,
            expiresIn: magicLinkData.expires_in,
            calculatedExpiry: expiresAtValue ? new Date(expiresAtValue * 1000).toISOString() : 'N/A'
          });
          
          const authTokens: AuthTokens = {
            accessToken: magicLinkData.access_token,
            refreshToken: magicLinkData.refresh_token,
            userId: 'magic_link_user', // Use a default value for now
            lastActivity: Date.now(),
            expiresAt: expiresAtValue, // Store the actual expiry time
          };
          
          console.log('💾 AuthStore: Storing auth tokens securely...', {
            lastActivity: new Date(authTokens.lastActivity).toISOString(),
            hasAccessToken: !!authTokens.accessToken,
            hasRefreshToken: !!authTokens.refreshToken,
            expiresAt: authTokens.expiresAt,
            magicLinkExpiresAt: magicLinkData.expires_at
          });
          
          await SecureStorageService.setAuthTokens(authTokens);
          
          // Initialize API client if not already initialized
          console.log('🔌 AuthStore: Initializing API client...');
          try {
            await ApiClientService.initialize();
            console.log('✅ AuthStore: API client initialized');
            
            // Create a proper session with the correct expires_at
            if (magicLinkData.expires_at) {
              const session = {
                access_token: magicLinkData.access_token!,
                refresh_token: magicLinkData.refresh_token!,
                expires_at: parseInt(magicLinkData.expires_at, 10),
                expires_in: parseInt(magicLinkData.expires_in || '3600', 10),
                token_type: magicLinkData.token_type || 'bearer',
                user: {
                  id: 'magic_link_user',
                  aud: 'authenticated',
                  role: 'authenticated',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  email: '',
                  app_metadata: {},
                  user_metadata: {},
                },
              };
              
              // Update the session provider with the correct session
              const sessionProvider = ApiClientService.getSessionProvider();
              await sessionProvider.setSession(session);
              console.log('✅ AuthStore: Session updated with correct expires_at');
            }
          } catch (initError) {
            console.warn('⚠️ AuthStore: API client initialization failed:', initError);
          }
          
          // Register device after successful authentication
          console.log('📱 AuthStore: Registering device with API...');
          try {
            await DeviceService.registerDevice();
            console.log('✅ AuthStore: Device registered successfully');
          } catch (deviceError) {
            // Log but don't fail authentication if device registration fails
            console.warn('⚠️ AuthStore: Device registration failed (non-critical):', deviceError);
          }
          
          set({
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          console.log('✅ AuthStore: Magic link authentication successful, isAuthenticated: true');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
          console.error('❌ AuthStore: Magic link authentication failed:', error);
          
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
        }
      },

      // Sign out
      signOut: async () => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🚪 Signing out...');
          
          // Clear secure storage
          await SecureStorageService.clearAuthTokens();
          
          // Clear state
          set({
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          console.log('✅ Sign out successful');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
          console.error('❌ Sign out failed:', error);
          
          // Clear state anyway for security
          set({
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      // Update activity timestamp
      updateActivity: async () => {
        try {
          await SecureStorageService.updateLastActivity();
        } catch (error) {
          console.error('Failed to update activity:', error);
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