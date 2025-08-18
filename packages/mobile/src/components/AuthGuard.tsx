import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import useAuthStore from '../store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  onUnauthenticated?: () => void;
}

/**
 * Auth Guard Component
 * 
 * Protects components/screens that require authentication.
 * Shows loading state during initialization and fallback for unauthenticated users.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = true,
  onUnauthenticated,
}) => {
  const { isAuthenticated, isInitialized, isLoading, initialize } = useAuthStore();

  // Initialize auth store if not already initialized
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Handle unauthenticated state
  useEffect(() => {
    if (isInitialized && !isAuthenticated && requireAuth && onUnauthenticated) {
      onUnauthenticated();
    }
  }, [isInitialized, isAuthenticated, requireAuth, onUnauthenticated]);

  // Show loading state during initialization
  if (!isInitialized || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Authentication Required</Text>
        <Text style={styles.message}>
          Please sign in to access this feature
        </Text>
      </View>
    );
  }

  // User is authenticated or auth is not required
  return <>{children}</>;
};

/**
 * Higher-order component for protecting screens
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode;
    onUnauthenticated?: () => void;
  }
) => {
  return (props: P) => (
    <AuthGuard
      fallback={options?.fallback}
      onUnauthenticated={options?.onUnauthenticated}
    >
      <Component {...props} />
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default AuthGuard;