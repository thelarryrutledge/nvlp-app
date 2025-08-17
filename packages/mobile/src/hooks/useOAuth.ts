import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import OAuthService, { OAuthResult } from '../services/oauthService';
import reactotron from '../config/reactotron';

interface UseOAuthState {
  isLoading: boolean;
  error: string | null;
  result: OAuthResult | null;
}

interface UseOAuthOptions {
  onSuccess?: (result: OAuthResult) => void;
  onError?: (error: Error) => void;
  showAlerts?: boolean;
}

/**
 * React hook for OAuth authentication
 * 
 * Provides an easy-to-use interface for OAuth flows in React components
 */
export const useOAuth = (options: UseOAuthOptions = {}) => {
  const { onSuccess, onError, showAlerts = true } = options;

  const [state, setState] = useState<UseOAuthState>({
    isLoading: false,
    error: null,
    result: null,
  });

  /**
   * Clear any existing error or result
   */
  const clearState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
    });
  }, []);

  /**
   * Authenticate with a specific provider
   */
  const authenticate = useCallback(async (providerKey: string) => {
    // Clear previous state
    setState({
      isLoading: true,
      error: null,
      result: null,
    });

    try {
      reactotron.log(`🔐 Starting OAuth authentication with ${providerKey}`);
      
      // Check if provider is ready
      if (!OAuthService.isProviderReady(providerKey)) {
        throw new Error(`OAuth provider '${providerKey}' is not properly configured`);
      }

      const result = await OAuthService.authenticate(providerKey);

      setState({
        isLoading: false,
        error: null,
        result,
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      if (showAlerts) {
        Alert.alert(
          'Authentication Successful',
          `Successfully authenticated with ${providerKey}`,
          [{ text: 'OK' }]
        );
      }

      reactotron.log(`✅ OAuth authentication successful with ${providerKey}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState({
        isLoading: false,
        error: errorMessage,
        result: null,
      });

      // Call error callback
      if (onError) {
        onError(error as Error);
      }

      if (showAlerts) {
        Alert.alert(
          'Authentication Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
      }

      reactotron.error(`❌ OAuth authentication failed with ${providerKey}:`, error as Error);
      throw error;
    }
  }, [onSuccess, onError, showAlerts]);

  /**
   * Authenticate with Supabase
   */
  const authenticateWithSupabase = useCallback(async () => {
    return authenticate('supabase');
  }, [authenticate]);

  /**
   * Authenticate with Google
   */
  const authenticateWithGoogle = useCallback(async () => {
    return authenticate('google');
  }, [authenticate]);

  /**
   * Authenticate with Apple
   */
  const authenticateWithApple = useCallback(async () => {
    return authenticate('apple');
  }, [authenticate]);

  /**
   * Get available OAuth providers
   */
  const getProviders = useCallback(() => {
    return OAuthService.getProviders();
  }, []);

  /**
   * Check if a provider is ready for authentication
   */
  const isProviderReady = useCallback((providerKey: string) => {
    return OAuthService.isProviderReady(providerKey);
  }, []);

  /**
   * Get OAuth configuration validation status
   */
  const getConfigurationStatus = useCallback(() => {
    return OAuthService.validateConfiguration();
  }, []);

  /**
   * Get provider statistics
   */
  const getProviderStats = useCallback(() => {
    return OAuthService.getProviderStats();
  }, []);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    result: state.result,

    // Actions
    authenticate,
    authenticateWithSupabase,
    authenticateWithGoogle,
    authenticateWithApple,
    clearState,

    // Utilities
    getProviders,
    isProviderReady,
    getConfigurationStatus,
    getProviderStats,
  };
};

/**
 * Hook specifically for Supabase OAuth authentication
 */
export const useSupabaseOAuth = (options: UseOAuthOptions = {}) => {
  const oauth = useOAuth(options);

  return {
    ...oauth,
    authenticate: oauth.authenticateWithSupabase,
  };
};

export default useOAuth;