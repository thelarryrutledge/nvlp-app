/**
 * Authentication Context
 * 
 * React context for managing authentication state with token management
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { tokenManager, type TokenData } from '../services/auth/tokenManager';
import { biometricService, type BiometricCapabilities, type BiometricAuthResult } from '../services/auth/biometricService';
import { authService } from '../services/api';
import type { LoginCredentials, RegisterCredentials, AuthResult } from '../services/api';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  accessToken: string | null;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  // Biometric authentication methods
  getBiometricCapabilities: () => Promise<BiometricCapabilities>;
  authenticateWithBiometrics: () => Promise<BiometricAuthResult>;
  enableBiometricAuth: () => Promise<boolean>;
  disableBiometricAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    error: null,
  });

  /**
   * Update auth state from token data
   */
  const updateAuthState = useCallback((tokenData: TokenData | null) => {
    setAuthState(prev => ({
      ...prev,
      isAuthenticated: !!tokenData,
      user: tokenData?.user || null,
      accessToken: tokenData?.accessToken || null,
      isLoading: false,
    }));
  }, []);

  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(async () => {
    try {
      const tokenData = await tokenManager.loadTokens();
      updateAuthState(tokenData);
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to initialize authentication',
      }));
    }
  }, [updateAuthState]);

  /**
   * Login with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await authService.login(credentials);
      
      // Create token data from login result
      const tokenData = tokenManager.createTokenData(
        result.session?.access_token,
        result.session?.refresh_token,
        result.user,
        result.session?.expires_in
      );
      
      await tokenManager.saveTokens(tokenData);
      updateAuthState(tokenData);
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
      throw error;
    }
  }, [updateAuthState]);

  /**
   * Register new user
   */
  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      
      const result = await authService.register(credentials);
      
      // Registration might not return session immediately (email confirmation required)
      console.log('Registration result in AuthContext:', result);
      if (result.session) {
        console.log('Registration returned session - auto-login');
        const tokenData = tokenManager.createTokenData(
          result.session.access_token,
          result.session.refresh_token,
          result.user,
          result.session.expires_in
        );
        
        await tokenManager.saveTokens(tokenData);
        updateAuthState(tokenData);
      } else {
        console.log('Registration requires email confirmation');
        // Don't change loading state - let the UI handle it locally
      }
      
      // Return the result so the UI can handle success messages
      return result;
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        error: error.message || 'Registration failed',
      }));
      throw error;
    }
  }, [updateAuthState]);

  /**
   * Logout and clear tokens
   */
  const logout = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call logout API if we have a valid token
      if (tokenManager.hasValidTokens()) {
        try {
          await authService.logout();
        } catch (error) {
          console.warn('Logout API call failed:', error);
          // Continue with local logout even if API call fails
        }
      }
      
      await tokenManager.clearTokens();
      updateAuthState(null);
    } catch (error: any) {
      console.error('Logout failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Logout failed',
      }));
    }
  }, [updateAuthState]);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = tokenManager.getRefreshToken();
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const result = await authService.refreshToken();
      
      const tokenData = tokenManager.createTokenData(
        result.session.access_token,
        result.session.refresh_token || refreshTokenValue,
        authState.user,
        result.session.expires_in
      );
      
      await tokenManager.saveTokens(tokenData);
      updateAuthState(tokenData);
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      // Clear tokens on refresh failure
      await tokenManager.clearTokens();
      updateAuthState(null);
      throw error;
    }
  }, [authState.user, updateAuthState]);

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      await authService.resetPassword(email);
      // Password reset doesn't change auth state, just sends email
    } catch (error: any) {
      throw error;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Get biometric capabilities
   */
  const getBiometricCapabilities = useCallback(async () => {
    return await biometricService.getCapabilities();
  }, []);

  /**
   * Authenticate with biometrics and auto-login if user has saved credentials
   */
  const authenticateWithBiometrics = useCallback(async () => {
    try {
      const result = await biometricService.authenticate('Sign in to NVLP');
      
      if (result.success) {
        // If biometric auth succeeds, try to load saved tokens
        const tokenData = await tokenManager.loadTokens();
        if (tokenData) {
          updateAuthState(tokenData);
        }
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  }, [updateAuthState]);

  /**
   * Enable biometric authentication
   */
  const enableBiometricAuth = useCallback(async () => {
    try {
      const capabilities = await biometricService.getCapabilities();
      
      if (!capabilities.isAvailable) {
        return false;
      }

      // Create biometric keys if they don't exist
      if (!capabilities.hasCredentials) {
        return await biometricService.createKeys();
      }
      
      return true;
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return false;
    }
  }, []);

  /**
   * Disable biometric authentication
   */
  const disableBiometricAuth = useCallback(async () => {
    try {
      return await biometricService.deleteKeys();
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
      return false;
    }
  }, []);


  /**
   * Set up token manager listener
   */
  useEffect(() => {
    const unsubscribe = tokenManager.addTokenListener(updateAuthState);
    return unsubscribe;
  }, [updateAuthState]);

  /**
   * Initialize authentication on mount
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Auto-refresh token when needed
   */
  useEffect(() => {
    if (!authState.isAuthenticated || authState.isLoading) {
      return;
    }

    const checkTokenRefresh = async () => {
      if (tokenManager.needsRefresh()) {
        try {
          await refreshToken();
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }
    };

    // Check immediately
    checkTokenRefresh();

    // Set up periodic check (every minute)
    const interval = setInterval(checkTokenRefresh, 60000);
    
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.isLoading, refreshToken]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    resetPassword,
    clearError,
    getBiometricCapabilities,
    authenticateWithBiometrics,
    enableBiometricAuth,
    disableBiometricAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check authentication status
 */
export function useAuthState(): Pick<AuthState, 'isAuthenticated' | 'isLoading' | 'user'> {
  const { isAuthenticated, isLoading, user } = useAuth();
  return { isAuthenticated, isLoading, user };
}

/**
 * HOC to require authentication
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthState();

    if (isLoading) {
      return null; // Or a loading component
    }

    if (!isAuthenticated) {
      return null; // Or redirect to login
    }

    return <Component {...props} />;
  };
}