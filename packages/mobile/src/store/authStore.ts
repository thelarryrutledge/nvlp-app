import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import SecureStorageService, { AuthTokens, DeviceInfo } from '../services/secureStorage';
import supabaseClient from '../services/supabaseClient';
import reactotron from '../config/reactotron';
import { MagicLinkData } from '../services/deepLinkService';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  deviceInfo: DeviceInfo | null;
  
  // Actions
  initialize: () => Promise<void>;
  signInWithMagicLink: (magicLinkData: MagicLinkData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setDeviceInfo: (deviceInfo: DeviceInfo) => Promise<void>;
  clearError: () => void;
  
  // Internal
  _setSession: (session: Session | null) => void;
  _setUser: (user: User | null) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
      deviceInfo: null,

      // Initialize auth state from secure storage
      initialize: async () => {
        const { isInitialized } = get();
        if (isInitialized) {
          reactotron.log('🔐 Auth store already initialized');
          return;
        }

        set({ isLoading: true, error: null });
        
        try {
          console.log('🔐 Initializing auth store...');
          reactotron.log('🔐 Initializing auth store...');
          
          // Try to restore session from secure storage
          console.log('🔐 Attempting to restore tokens from secure storage...');
          const tokens = await SecureStorageService.getAuthTokens();
          console.log('🔐 Tokens result:', tokens ? 'found' : 'none');
          
          const deviceInfo = await SecureStorageService.getDeviceInfo();
          console.log('🔐 Device info result:', deviceInfo ? 'found' : 'none');
          
          if (tokens && tokens.expiresAt > Date.now()) {
            console.log('🔐 Valid tokens found, restoring session...');
            // Validate session with Supabase
            const sessionResult = await supabaseClient.exchangeCodeForSession(
              tokens.accessToken,
              tokens.refreshToken
            );
            
            if (sessionResult.success && sessionResult.session) {
              set({
                session: sessionResult.session,
                user: sessionResult.user,
                isAuthenticated: true,
                deviceInfo,
                isInitialized: true,
                isLoading: false,
                error: null,
              });
              
              console.log('✅ Auth restored from secure storage:', sessionResult.user?.email);
              reactotron.log('✅ Auth restored from secure storage:', sessionResult.user?.email);
              return;
            }
          }
          
          // No valid session found
          console.log('🔐 No valid session found during initialization');
          set({
            isInitialized: true,
            isLoading: false,
            isAuthenticated: false,
            session: null,
            user: null,
            deviceInfo,
          });
          
          reactotron.log('🔐 No valid session found during initialization');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth';
          console.error('❌ Failed to initialize auth store:', error);
          reactotron.error('Failed to initialize auth store:', error as Error);
          
          set({
            isInitialized: true,
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            session: null,
            user: null,
          });
        }
      },

      // Sign in with magic link
      signInWithMagicLink: async (magicLinkData: MagicLinkData) => {
        console.log('🔑 Starting magic link authentication...', magicLinkData);
        set({ isLoading: true, error: null });
        
        try {
          reactotron.log('🔑 Processing magic link authentication...');
          console.log('🔑 Processing magic link authentication...', {
            hasAccessToken: !!magicLinkData.access_token,
            hasRefreshToken: !!magicLinkData.refresh_token,
            error: magicLinkData.error
          });
          
          if (!magicLinkData.access_token || !magicLinkData.refresh_token) {
            console.error('Invalid magic link data:', magicLinkData);
            throw new Error('Invalid magic link data');
          }
          
          // Exchange tokens for session
          console.log('🔄 Exchanging tokens for session...');
          const result = await supabaseClient.exchangeCodeForSession(
            magicLinkData.access_token,
            magicLinkData.refresh_token
          );
          
          console.log('🔄 Session exchange result:', {
            success: result.success,
            hasSession: !!result.session,
            hasUser: !!result.user,
            error: result.error
          });
          
          if (!result.success || !result.session) {
            console.error('Session exchange failed:', result.error);
            throw new Error(result.error || 'Failed to establish session');
          }
          
          // Store tokens securely
          const authTokens: AuthTokens = {
            accessToken: result.session.access_token,
            refreshToken: result.session.refresh_token,
            expiresAt: result.session.expires_at ? result.session.expires_at * 1000 : Date.now() + 3600000,
            userId: result.user?.id || '',
          };
          
          await SecureStorageService.setAuthTokens(authTokens);
          
          // Update state
          console.log('✅ Setting authenticated state...');
          set({
            session: result.session,
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          console.log('✅ Authentication successful:', result.user?.email);
          reactotron.log('✅ Authentication successful:', result.user?.email);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
          console.error('❌ Magic link authentication failed:', error);
          reactotron.error('Magic link authentication failed:', error as Error);
          
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
            session: null,
            user: null,
          });
        }
      },

      // Sign out
      signOut: async () => {
        set({ isLoading: true, error: null });
        
        try {
          reactotron.log('🚪 Signing out...');
          
          // Sign out from Supabase
          await supabaseClient.signOut();
          
          // Clear secure storage
          await SecureStorageService.clearAuthTokens();
          await SecureStorageService.clearPIN();
          
          // Clear state
          set({
            session: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          reactotron.log('✅ Sign out successful');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
          reactotron.error('Sign out failed:', error as Error);
          
          // Clear state anyway for security
          set({
            session: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      // Refresh session
      refreshSession: async () => {
        const { session } = get();
        
        if (!session) {
          reactotron.log('No session to refresh');
          return;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          reactotron.log('🔄 Refreshing session...');
          
          const currentSessionResult = await supabaseClient.getCurrentSession();
          
          if (currentSessionResult.success && currentSessionResult.session) {
            // Update tokens in secure storage
            const authTokens: AuthTokens = {
              accessToken: currentSessionResult.session.access_token,
              refreshToken: currentSessionResult.session.refresh_token,
              expiresAt: currentSessionResult.session.expires_at 
                ? currentSessionResult.session.expires_at * 1000 
                : Date.now() + 3600000,
              userId: currentSessionResult.session.user?.id || '',
            };
            
            await SecureStorageService.setAuthTokens(authTokens);
            
            set({
              session: currentSessionResult.session,
              user: currentSessionResult.session.user,
              isLoading: false,
              error: null,
            });
            
            reactotron.log('✅ Session refreshed successfully');
          } else {
            // Session expired, need to re-authenticate
            set({
              session: null,
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Session expired. Please sign in again.',
            });
            
            await SecureStorageService.clearAuthTokens();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to refresh session';
          reactotron.error('Session refresh failed:', error as Error);
          
          set({
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      // Set device info
      setDeviceInfo: async (deviceInfo: DeviceInfo) => {
        try {
          await SecureStorageService.setDeviceInfo(deviceInfo);
          set({ deviceInfo });
          reactotron.log('📱 Device info stored:', deviceInfo.deviceId);
        } catch (error) {
          reactotron.error('Failed to store device info:', error as Error);
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Internal setters
      _setSession: (session) => set({ session }),
      _setUser: (user) => set({ user }),
      _setLoading: (isLoading) => set({ isLoading }),
      _setError: (error) => set({ error }),
    }),
    {
      name: 'nvlp-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist non-sensitive data
      partialize: (state) => ({
        isInitialized: state.isInitialized,
        deviceInfo: state.deviceInfo,
      }),
    }
  )
);

export default useAuthStore;