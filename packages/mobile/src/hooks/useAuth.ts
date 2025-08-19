import { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import useAuthStore from '../store/authStore';
import useMagicLink from './useMagicLink';
import reactotron from '../config/reactotron';

interface UseAuthOptions {
  autoInitialize?: boolean;
  showAlerts?: boolean;
}

/**
 * Main authentication hook that combines auth store with magic link handling
 * 
 * This hook:
 * - Manages the overall authentication state
 * - Handles magic link authentication
 * - Provides auth actions (signIn, signOut, refresh)
 * - Automatically initializes on mount
 */
export const useAuth = (options: UseAuthOptions = {}) => {
  const {
    autoInitialize = true,
    showAlerts = true,
  } = options;

  // Get auth store state and actions
  const {
    user,
    session,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    deviceInfo,
    initialize,
    signInWithMagicLink,
    signOut,
    refreshSession,
    setDeviceInfo,
    clearError,
  } = useAuthStore();

  // Set up magic link handling
  const magicLink = useMagicLink({
    autoInitialize: false, // We'll initialize manually
    showAlerts: false, // We'll handle alerts here
    onMagicLink: async (data) => {
      reactotron.log('🔗 Magic link received in useAuth:', data);
      console.log('🔗 Magic link received in useAuth:', data);
      
      // Process the magic link through the auth store
      try {
        await signInWithMagicLink(data);
        
        if (showAlerts && !error) {
          Alert.alert(
            'Authentication Successful',
            'You have been successfully signed in!',
            [{ text: 'OK' }]
          );
        }
      } catch (authError) {
        console.error('Magic link processing failed:', authError);
        reactotron.error('Magic link processing failed:', authError as Error);
      }
    },
    onError: (errorMessage) => {
      console.error('Magic link error in useAuth:', errorMessage);
      reactotron.error('Magic link error in useAuth:', new Error(errorMessage));
      
      if (showAlerts) {
        Alert.alert(
          'Authentication Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    },
  });

  // Initialize auth store and magic link service
  const initializeAuth = useCallback(async () => {
    try {
      console.log('🔧 Initializing auth system...');
      
      // Initialize auth store first
      await initialize();
      console.log('✅ Auth store initialized');
      
      // Then initialize magic link service
      await magicLink.initialize();
      console.log('✅ Magic link service initialized');
      
      reactotron.log('✅ Auth system fully initialized');
      console.log('✅ Auth system fully initialized');
    } catch (error) {
      console.error('Failed to initialize auth system:', error);
      reactotron.error('Failed to initialize auth system:', error as Error);
      
      if (showAlerts) {
        Alert.alert(
          'Initialization Error',
          'Failed to initialize authentication system',
          [{ text: 'OK' }]
        );
      }
    }
  }, [initialize, magicLink, showAlerts]);

  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initializeAuth();
    }
  }, [autoInitialize, isInitialized, initializeAuth]);

  // Auto-refresh session when it's about to expire
  useEffect(() => {
    if (!session) return;

    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    // Refresh 5 minutes before expiry
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
    
    if (refreshTime <= 0) {
      // Already expired or about to expire
      refreshSession();
      return;
    }

    const timer = setTimeout(() => {
      reactotron.log('⏰ Auto-refreshing session...');
      refreshSession();
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [session, refreshSession]);

  // Handle authentication errors
  useEffect(() => {
    if (error && showAlerts) {
      Alert.alert(
        'Authentication Error',
        error,
        [
          { 
            text: 'OK',
            onPress: clearError,
          }
        ]
      );
    }
  }, [error, showAlerts, clearError]);

  return {
    // State
    user,
    session,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    deviceInfo,
    
    // Actions
    initialize: initializeAuth,
    signOut,
    refreshSession,
    setDeviceInfo,
    clearError,
    
    // Magic link utilities
    magicLink: {
      isReady: magicLink.isReady,
      getRedirectURL: magicLink.getRedirectURL,
      validateConfiguration: magicLink.validateConfiguration,
      testMagicLink: magicLink.testMagicLink,
      getStats: magicLink.getStats,
    },
  };
};

export default useAuth;