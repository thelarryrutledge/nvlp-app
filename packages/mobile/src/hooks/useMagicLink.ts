import { useState, useEffect, useCallback } from 'react';
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

  const [state, setState] = useState<UseMagicLinkState>({
    isReady: false,
    lastMagicLink: null,
    error: null,
  });

  /**
   * Initialize deep link service
   */
  const initialize = useCallback(async () => {
    try {
      // Register custom magic link handler
      DeepLinkService.registerHandler('magic-link', {
        scheme: 'auth',
        handler: async (url: string, data: MagicLinkData) => {
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

            if (onError) {
              onError(errorMessage);
            }

            if (showAlerts) {
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
            if (onMagicLink) {
              onMagicLink(data);
            }

            if (showAlerts) {
              Alert.alert(
                'Authentication Successful',
                'You have been successfully authenticated!',
                [{ text: 'OK' }]
              );
            }
          }
        },
      });

      await DeepLinkService.initialize();
      
      setState(prev => ({
        ...prev,
        isReady: true,
        error: null,
      }));

      reactotron.log('🔗 Magic link hook initialized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize magic link service';
      
      setState(prev => ({
        ...prev,
        isReady: false,
        error: errorMessage,
      }));

      if (onError) {
        onError(errorMessage);
      }

      reactotron.error('Magic link hook initialization failed:', error as Error);
    }
  }, [onMagicLink, onError, showAlerts]);

  /**
   * Clean up handler
   */
  const cleanup = useCallback(() => {
    DeepLinkService.unregisterHandler('magic-link');
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
    return cleanup;
  }, [autoInitialize, initialize, cleanup]);

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