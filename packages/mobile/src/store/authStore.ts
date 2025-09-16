import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageService, { AuthTokens } from '../services/secureStorage';
import { MagicLinkData } from '../services/deepLinkService';
import { validateJWTForSecurity } from '../utils/jwt';
import DeviceService from '../services/deviceService';
import ApiClientService from '../services/apiClient';
import supabaseClient from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  signInWithMagicLink: (magicLinkData: MagicLinkData) => Promise<void>;
  handleSupabaseSession: (session: Session | null) => Promise<void>;
  signOut: () => Promise<void>;
  updateActivity: () => Promise<void>;
  clearError: () => void;
  
  // Getters for tokens (don't store in state for security)
  getAccessToken: () => Promise<string | null>;
  hasValidTokens: () => Promise<boolean>;
  
  // Session invalidation handling
  handleSessionInvalidated: (errorMessage: string) => Promise<void>;
}

// Global flag to prevent multiple auth listeners
let authListenerInitialized = false;

// Global flag to prevent multiple simultaneous session handling
let sessionHandlingInProgress = false;

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
        
        // Set up Supabase auth state listener (only once)
        if (!authListenerInitialized) {
          console.log('🔐 AuthStore: Setting up Supabase auth listener...');
          authListenerInitialized = true;
          
          supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('🔐 AuthStore: Auth state changed:', event, { hasSession: !!session });
            
            if (event === 'SIGNED_IN' && session) {
              await get().handleSupabaseSession(session);
            } else if (event === 'SIGNED_OUT') {
              await get().handleSupabaseSession(null);
            } else if (event === 'TOKEN_REFRESHED' && session) {
              // Update stored tokens when they're refreshed
              console.log('🔐 AuthStore: Token refreshed, updating storage...');
              const authTokens: AuthTokens = {
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                userId: session.user?.id || '',
                expiresAt: session.expires_at,
                lastActivity: Date.now(),
              };
              await SecureStorageService.setAuthTokens(authTokens);
              
              // Reload the session in the API client
              await ApiClientService.reloadSession();
            }
          });
        } else {
          console.log('🔐 AuthStore: Auth listener already initialized, skipping...');
        }
        
        // Small delay to let magic link processing take precedence if app opened with deep link
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check if we've been initialized by magic link while waiting
        const { isInitialized: nowInitialized } = get();
        if (nowInitialized) {
          console.log('🔐 AuthStore: Initialized by magic link during delay, skipping stored token check');
          return;
        }
        
        try {
          // Check for existing Supabase session first
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session) {
            console.log('🔐 AuthStore: Found existing Supabase session');
            await get().handleSupabaseSession(session);
            return;
          }
          
          // Fall back to checking stored tokens
          const tokens = await SecureStorageService.getAuthTokens();
          
          if (tokens) {
            console.log('✅ AuthStore: Found stored tokens, trusting them and signing in');
            await SecureStorageService.updateLastActivity();
            // Don't initialize API client here - let it happen lazily when needed
            
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

      // Sign in with magic link
      signInWithMagicLink: async (magicLinkData: MagicLinkData) => {
        console.log('🔑 AuthStore: Starting magic link authentication...');
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
          
          // Clear any existing tokens first (magic link overrides stored tokens)
          console.log('🗑️ AuthStore: Clearing any existing tokens...');
          await SecureStorageService.clearAuthTokens();
          
          // Prepare new tokens from magic link
          console.log('🔍 AuthStore: Magic link data received:', {
            hasExpiresAt: !!magicLinkData.expires_at,
            expiresAt: magicLinkData.expires_at,
            expiresIn: magicLinkData.expires_in,
            type: typeof magicLinkData.expires_at
          });
          
          // Parse expires_at - it comes as a string from the URL
          let expiresAtValue: number | undefined;
          
          if (magicLinkData.expires_at) {
            // Use expires_at if available (absolute timestamp)
            expiresAtValue = typeof magicLinkData.expires_at === 'string' 
              ? parseInt(magicLinkData.expires_at, 10) 
              : magicLinkData.expires_at;
            console.log('🔍 AuthStore: Using expires_at from magic link:', {
              original: magicLinkData.expires_at,
              parsed: expiresAtValue,
              isValid: !isNaN(expiresAtValue),
              expiryDate: new Date(expiresAtValue * 1000).toISOString()
            });
          } else if (magicLinkData.expires_in) {
            // Fallback: calculate from expires_in (relative seconds)
            const expiresIn = typeof magicLinkData.expires_in === 'string'
              ? parseInt(magicLinkData.expires_in, 10)
              : magicLinkData.expires_in;
            expiresAtValue = Math.floor(Date.now() / 1000) + expiresIn;
            console.log('🔍 AuthStore: Calculated expires_at from expires_in:', {
              expiresIn,
              calculated: expiresAtValue,
              expiryDate: new Date(expiresAtValue * 1000).toISOString()
            });
          } else {
            console.warn('⚠️ AuthStore: No expiry information in magic link!');
          }
          
          // Extract user ID from the JWT token
          let userId = 'unknown_user';
          try {
            // Decode JWT to get user ID (sub claim)
            const tokenParts = magicLinkData.access_token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              userId = payload.sub || 'unknown_user';
              console.log('🔍 AuthStore: Extracted user ID from JWT:', userId);
            }
          } catch (e) {
            console.warn('⚠️ AuthStore: Could not extract user ID from JWT:', e);
          }
          
          const authTokens: AuthTokens = {
            accessToken: magicLinkData.access_token,
            refreshToken: magicLinkData.refresh_token,
            userId,
            lastActivity: Date.now(),
            expiresAt: expiresAtValue,
          };
          
          console.log('🔍 AuthStore: Created token object with expiresAt:', {
            expiresAtValue,
            tokenExpiresAt: authTokens.expiresAt,
            isUndefined: authTokens.expiresAt === undefined
          });
          
          console.log('💾 AuthStore: Storing new auth tokens...');
          console.log('📋 Full token object being stored:', JSON.stringify(authTokens, null, 2));
          console.log('📊 Token expiry details:', {
            hasExpiresAt: !!authTokens.expiresAt,
            expiresAt: authTokens.expiresAt,
            expiresAtDate: authTokens.expiresAt ? new Date(authTokens.expiresAt * 1000).toISOString() : 'N/A',
            expiresAtType: typeof authTokens.expiresAt
          });
          await SecureStorageService.setAuthTokens(authTokens);
          console.log('✅ AuthStore: Tokens stored successfully');
          
          // For magic link sign-in, we should register the device
          // This is a new authentication event
          try {
            console.log('📱 AuthStore: Registering device after magic link sign-in...');
            // Initialize API client first with the fresh tokens
            await ApiClientService.initialize();
            await DeviceService.registerDevice();
            console.log('✅ AuthStore: Device registered successfully');
            
            // Check for other new devices
            await DeviceService.checkForNewDevices();
          } catch (deviceError) {
            // Don't fail auth if device registration fails
            console.warn('⚠️ AuthStore: Device registration failed (non-critical):', deviceError);
          }
          
          set({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
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

      // Handle Supabase session changes (for email/password auth)
      handleSupabaseSession: async (session: Session | null) => {
        console.log('🔐 AuthStore: Handling Supabase session change:', { hasSession: !!session });
        
        // Prevent multiple simultaneous session handling
        if (sessionHandlingInProgress) {
          console.log('🔐 AuthStore: Session handling already in progress, skipping...');
          return;
        }
        
        sessionHandlingInProgress = true;
        
        try {
          if (session) {
            set({ isLoading: true, error: null });
            
            // Validate the access token for security
            console.log('🔒 AuthStore: Validating session JWT token security...');
            const jwtValidation = validateJWTForSecurity(session.access_token);
            
            if (!jwtValidation.isValid) {
              console.error('❌ AuthStore: JWT validation failed:', jwtValidation.reason);
              throw new Error(`Security validation failed: ${jwtValidation.reason}`);
            }
            
            console.log('✅ AuthStore: Session JWT token is valid');
            
            // Clear any existing tokens first
            console.log('🗑️ AuthStore: Clearing any existing tokens...');
            await SecureStorageService.clearAuthTokens();
            
            // Extract user ID from the session
            const userId = session.user?.id || '';
            
            // Store the new tokens
            const authTokens: AuthTokens = {
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
              userId,
              expiresAt: session.expires_at,
              lastActivity: Date.now(),
            };
            
            console.log('💾 AuthStore: Storing session tokens...');
            await SecureStorageService.setAuthTokens(authTokens);
            await SecureStorageService.updateLastActivity();
            
            // Initialize API client (it will pick up the session from storage)
            console.log('🔧 AuthStore: Initializing API client...');
            await ApiClientService.initialize();
            
            // Reload the session in the API client to get the fresh tokens
            console.log('🔄 AuthStore: Reloading session in API client...');
            await ApiClientService.reloadSession();
            
            set({
              isAuthenticated: true,
              isInitialized: true,
              isLoading: false,
              error: null,
            });
            
            console.log('✅ AuthStore: Session authenticated successfully');
            
            // Register device for new sign-in (async, don't wait for it)
            DeviceService.registerDevice().then(() => {
              console.log('✅ AuthStore: Device registered successfully');
            }).catch((deviceError) => {
              console.warn('⚠️ AuthStore: Device registration failed:', deviceError);
              // Don't fail auth if device registration fails
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Session authentication failed';
            console.error('❌ AuthStore: Session authentication failed:', error);
            
            // Clear tokens on failure
            await SecureStorageService.clearAuthTokens();
            
            set({
              isInitialized: true,
              isLoading: false,
              error: errorMessage,
              isAuthenticated: false,
            });
          }
        } else {
          // Session was cleared (sign out)
          console.log('🚪 AuthStore: Session cleared, updating state...');
          
          // Clear tokens and update state without calling signOut (to avoid infinite loop)
          await SecureStorageService.clearAuthTokens();
          await DeviceService.clearKnownDevices();
          
          set({
            isAuthenticated: false,
            isInitialized: true,
            isLoading: false,
            error: null,
          });
        }
        } finally {
          sessionHandlingInProgress = false;
        }
      },

      // Sign out
      signOut: async () => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🚪 Signing out...');
          
          // Sign out from Supabase
          await supabaseClient.auth.signOut();
          
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