/**
 * useApiClient Hook
 * 
 * React hook for accessing the NVLP API client with authentication state
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import type { AuthState } from '@nvlp/client';

interface ApiClientHook {
  client: typeof apiClient;
  authState: AuthState;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useApiClient(): ApiClientHook {
  const [authState, setAuthState] = useState<AuthState>({
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize authentication state from client
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get current auth state from client
        const currentAuthState = apiClient.getAuthState();
        setAuthState(currentAuthState);
        
        // Check if we need to refresh token
        if (apiClient.needsTokenRefresh() && currentAuthState.refreshToken) {
          try {
            await apiClient.refreshToken();
            setAuthState(apiClient.getAuthState());
          } catch (refreshError) {
            console.warn('Token refresh failed:', refreshError);
            // Don't set error here, as this is expected for expired refresh tokens
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize API client');
        console.error('API client initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return {
    client: apiClient,
    authState,
    isAuthenticated: apiClient.isAuthenticated(),
    isLoading,
    error,
  };
}

// Export a hook for authentication operations
export function useAuth() {
  const { client, authState, isAuthenticated, isLoading, error } = useApiClient();

  const login = async (email: string, password: string) => {
    try {
      const result = await client.login(email, password);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await client.logout();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      const result = await client.register(email, password, displayName);
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  return {
    authState,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
  };
}