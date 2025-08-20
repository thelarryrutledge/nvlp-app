import { useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import useAuthStore from '../store/authStore';
import useMagicLink from './useMagicLink';

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
  
  // No need for initialization tracking - handled by the stores

  // Get auth store state and actions
  const {
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    initialize,
    signInWithMagicLink,
    signOut,
    updateActivity,
    clearError,
    getAccessToken,
    hasValidTokens,
  } = useAuthStore();

  // Set up magic link handling
  const magicLink = useMagicLink({
    autoInitialize: true, // Let it auto-initialize
    showAlerts: false, // We'll handle alerts here
    onMagicLink: async (data) => {
      console.log('🔗 Magic link received in useAuth:', data);
      
      // Process the magic link through the auth store
      try {
        await signInWithMagicLink(data);
        
        if (showAlerts) {
          Alert.alert(
            'Authentication Successful',
            'You have been successfully signed in!',
            [{ text: 'OK' }]
          );
        }
      } catch (authError) {
        console.error('Magic link processing failed:', authError);
        
        // Show specific error message for JWT validation failures
        const errorMessage = authError instanceof Error ? authError.message : 'Authentication failed';
        if (errorMessage.includes('Security validation failed')) {
          if (showAlerts) {
            Alert.alert(
              'Authentication Error',
              'This magic link has expired or is invalid. Please request a new one.',
              [{ text: 'OK' }]
            );
          }
        }
      }
    },
    onError: (errorMessage) => {
      console.error('Magic link error in useAuth:', errorMessage);
      
      if (showAlerts) {
        Alert.alert(
          'Authentication Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    },
  });

  // Initialize auth store
  const initializeAuth = useCallback(async () => {
    try {
      console.log('🔧 Initializing auth system...');
      
      // Initialize auth store - magic link service auto-initializes
      await initialize();
      console.log('✅ Auth system initialized');
    } catch (error) {
      console.error('Non-critical initialization warning:', error);
      
      // Don't show alerts for initialization errors - they're usually not critical
      // The app can still function even if initialization has some issues
    }
  }, [initialize]);

  // Auto-initialize on mount if enabled
  useEffect(() => {
    console.log('🔧 useAuth: useEffect triggered', { autoInitialize, isInitialized });
    if (autoInitialize && !isInitialized) {
      console.log('🔧 useAuth: Calling initializeAuth...');
      initializeAuth();
    } else {
      console.log('🔧 useAuth: Skipping initialization - autoInitialize:', autoInitialize, 'isInitialized:', isInitialized);
    }
  }, [autoInitialize, isInitialized, initializeAuth]);

  // Update activity when user interacts with the app
  useEffect(() => {
    if (isAuthenticated) {
      updateActivity();
    }
  }, [isAuthenticated, updateActivity]);

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

  // Debug log the current auth state
  console.log('🔧 useAuth: Returning auth state', { 
    isAuthenticated, 
    isLoading, 
    isInitialized 
  });

  return {
    // State
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    
    // Actions
    initialize: initializeAuth,
    signOut,
    updateActivity,
    clearError,
    
    // Token utilities
    getAccessToken,
    hasValidTokens,
    
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