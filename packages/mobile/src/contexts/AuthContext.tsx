import React, { createContext, useContext, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import useAuthStore from '../store/authStore';

interface AuthContextValue {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  signOut: () => Promise<void>;
  updateActivity: () => Promise<void>;
  clearError: () => void;
  
  // Token utilities
  getAccessToken: () => Promise<string | null>;
  hasValidTokens: () => Promise<boolean>;
  
  // Magic link utilities
  magicLink: {
    isReady: boolean;
    getRedirectURL: () => string;
    validateConfiguration: () => { isValid: boolean; errors: string[] };
    testMagicLink: (url: string) => any;
    getStats: () => any;
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  autoInitialize?: boolean;
  showAlerts?: boolean;
}

/**
 * Auth Provider Component
 * 
 * Provides authentication state and actions to the entire app.
 * Wraps the app with auth context and handles initialization.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  autoInitialize = true,
  showAlerts = true,
}) => {
  console.log('🏗️ AuthProvider: Rendering with props', { autoInitialize, showAlerts });
  
  const auth = useAuth({
    autoInitialize,
    showAlerts,
  });
  
  console.log('🏗️ AuthProvider: useAuth result', { 
    isAuthenticated: auth.isAuthenticated, 
    isInitialized: auth.isInitialized,
    isLoading: auth.isLoading 
  });

  // Re-render debug
  React.useEffect(() => {
    console.log('🏗️ AuthProvider: Auth state changed', {
      isAuthenticated: auth.isAuthenticated,
      isInitialized: auth.isInitialized,
      isLoading: auth.isLoading
    });
  }, [auth.isAuthenticated, auth.isInitialized, auth.isLoading]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 * 
 * @throws Error if used outside of AuthProvider
 */
export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Hook to check if user is authenticated
 * 
 * Simple hook that returns just the authentication status
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
};

/**
 * Hook to get access token
 * 
 * Simple hook that returns the access token
 */
export const useAccessToken = (): (() => Promise<string | null>) => {
  const { getAccessToken } = useAuthContext();
  return getAccessToken;
};

export default AuthContext;