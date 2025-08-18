import React, { createContext, useContext, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import useAuthStore from '../store/authStore';
import { User, Session } from '@supabase/supabase-js';
import { DeviceInfo } from '../services/secureStorage';

interface AuthContextValue {
  // State
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  deviceInfo: DeviceInfo | null;
  
  // Actions
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setDeviceInfo: (deviceInfo: DeviceInfo) => Promise<void>;
  clearError: () => void;
  
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
  const auth = useAuth({
    autoInitialize,
    showAlerts,
  });

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
 * Hook to get current user
 * 
 * Simple hook that returns just the current user
 */
export const useCurrentUser = (): User | null => {
  const { user } = useAuthContext();
  return user;
};

/**
 * Hook to get current session
 * 
 * Simple hook that returns just the current session
 */
export const useSession = (): Session | null => {
  const { session } = useAuthContext();
  return session;
};

export default AuthContext;