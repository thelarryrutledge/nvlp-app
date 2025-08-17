import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { env } from '../config/env';
import { reportError } from '../hooks/useGlobalErrorHandler';

/**
 * Development component for testing error handling
 * Only rendered in development mode
 */
export const ErrorTestComponent: React.FC = () => {
  const [shouldCrash, setShouldCrash] = useState(false);

  // Only show in development
  if (env.NODE_ENV !== 'development') {
    return null;
  }

  const triggerComponentError = () => {
    setShouldCrash(true);
  };

  const triggerPromiseRejection = () => {
    Promise.reject(new Error('Test unhandled promise rejection'));
  };

  const triggerCustomError = () => {
    try {
      throw new Error('Test custom error reporting');
    } catch (error) {
      reportError(error as Error, 'ErrorTestComponent');
    }
  };

  const triggerJavaScriptError = () => {
    // This will trigger a global error
    setTimeout(() => {
      throw new Error('Test global JavaScript error');
    }, 100);
  };

  // This will cause a render error
  if (shouldCrash) {
    throw new Error('Test component crash from ErrorTestComponent');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Error Testing (Dev Only)</Text>
      <Text style={styles.subtitle}>
        Test the error boundary and global error handling
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.errorButton]}
          onPress={triggerComponentError}
        >
          <Text style={styles.buttonText}>Trigger Component Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={triggerPromiseRejection}
        >
          <Text style={styles.buttonText}>Trigger Promise Rejection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={triggerCustomError}
        >
          <Text style={styles.buttonText}>Trigger Custom Error</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={triggerJavaScriptError}
        >
          <Text style={styles.buttonText}>Trigger JS Error</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        Note: Component errors will show the error boundary UI.
        Other errors will be logged to console and error service.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffc107',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  errorButton: {
    backgroundColor: '#dc3545',
  },
  warningButton: {
    backgroundColor: '#ffc107',
  },
  infoButton: {
    backgroundColor: '#17a2b8',
  },
  dangerButton: {
    backgroundColor: '#6f42c1',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  note: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ErrorTestComponent;