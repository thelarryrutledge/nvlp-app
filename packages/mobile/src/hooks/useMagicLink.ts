import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import DeepLinkService, { MagicLinkData } from '../services/deepLinkService';
import reactotron from '../config/reactotron';

interface UseMagicLinkState {
  isReady: boolean;
  lastMagicLink: MagicLinkData | null;
  error: string | null;
}

interface UseMagicLinkOptions {
  onMagicLink?: (data: MagicLinkData) => void;
  onError?: (error: string) => void;
  showAlerts?: boolean;
  autoInitialize?: boolean;
}

/**
 * React hook for magic link authentication
 * 
 * Handles deep link initialization and magic link processing
 */
export const useMagicLink = (options: UseMagicLinkOptions = {}) => {
  const {
    onMagicLink,
    onError,
    showAlerts = true,
    autoInitialize = true,
  } = options;
  
  // Remove initialization tracking - DeepLinkService is initialized in App.tsx

  const [state, setState] = useState<UseMagicLinkState>({
    isReady: false,
    lastMagicLink: null,
    error: null,
  });

  // Use refs to store latest callback functions to avoid stale closures
  const onMagicLinkRef = useRef(onMagicLink);
  const onErrorRef = useRef(onError);
  const showAlertsRef = useRef(showAlerts);
  
  // Update refs when props change
  useEffect(() => {
    onMagicLinkRef.current = onMagicLink;
    onErrorRef.current = onError;
    showAlertsRef.current = showAlerts;
  });

  /**
   * Initialize deep link service
   */
  const initialize = useCallback(async () => {
    try {
      // Just register our handler - DeepLinkService is already initialized
      console.log('🔧 Registering magic link handler in useMagicLink...');
      
      // Check if DeepLinkService is already initialized
      const stats = DeepLinkService.getStats();
      if (!stats.isInitialized) {
        console.log('🔧 DeepLinkService not initialized, initializing now...');
        await DeepLinkService.initialize();
      }
      
      DeepLinkService.registerHandler('auth', {
        scheme: 'auth',
        handler: async (url: string, data: MagicLinkData) => {
          console.log('🔗 Magic link received via hook:', url, data);
          reactotron.log('🔗 Magic link received via hook:', data);
          
          setState(prev => ({
            ...prev,
            lastMagicLink: data,
            error: null,
          }));

          // Handle errors
          if (data.error) {
            const errorMessage = data.error_description || data.error;
            
            setState(prev => ({
              ...prev,
              error: errorMessage,
            }));

            if (onErrorRef.current) {
              onErrorRef.current(errorMessage);
            }

            if (showAlertsRef.current) {
              Alert.alert(
                'Authentication Error',
                errorMessage,
                [{ text: 'OK' }]
              );
            }
            return;
          }

          // Handle successful authentication
          if (data.access_token) {
            console.log('✅ Magic link has access token, calling handler...');
            if (onMagicLinkRef.current) {
              onMagicLinkRef.current(data);
            } else {
              console.warn('⚠️ No magic link handler registered');
            }

            if (showAlertsRef.current) {
              Alert.alert(
                'Authentication Successful',
                'You have been successfully authenticated!',
                [{ text: 'OK' }]
              );
            }
          }
        },
      });

      // Mark as ready
      setState(prev => ({
        ...prev,
        isReady: true,
        error: null,
      }));

      console.log('✅ Magic link handler registered');
      reactotron.log('🔗 Magic link handler registered');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize magic link service';
      
      setState(prev => ({
        ...prev,
        isReady: false,
        error: errorMessage,
      }));

      if (onErrorRef.current) {
        onErrorRef.current(errorMessage);
      }

      reactotron.error('Magic link hook initialization failed:', error as Error);
    }
  }, []); // Stable callback using refs

  /**
   * Clean up handler
   */
  const cleanup = useCallback(() => {
    DeepLinkService.unregisterHandler('auth');
    setState({
      isReady: false,
      lastMagicLink: null,
      error: null,
    });
  }, []);

  /**
   * Clear last magic link data
   */
  const clearMagicLink = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastMagicLink: null,
      error: null,
    }));
  }, []);

  /**
   * Get magic link redirect URL
   */
  const getRedirectURL = useCallback(() => {
    return DeepLinkService.getMagicLinkRedirectURL();
  }, []);

  /**
   * Validate configuration
   */
  const validateConfiguration = useCallback(() => {
    return DeepLinkService.validateConfiguration();
  }, []);

  /**
   * Test magic link parsing (for development)
   */
  const testMagicLink = useCallback((testUrl: string) => {
    return DeepLinkService.testMagicLink(testUrl);
  }, []);

  /**
   * Get service statistics
   */
  const getStats = useCallback(() => {
    return DeepLinkService.getStats();
  }, []);

  // Auto-initialize if enabled
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [autoInitialize]); // Only depend on autoInitialize

  return {
    // State
    isReady: state.isReady,
    lastMagicLink: state.lastMagicLink,
    error: state.error,

    // Actions
    initialize,
    cleanup,
    clearMagicLink,

    // Utilities
    getRedirectURL,
    validateConfiguration,
    testMagicLink,
    getStats,
  };
};

export default useMagicLink;