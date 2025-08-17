import { useEffect } from 'react';
import { Alert } from 'react-native';
import { env } from '../config/env';

interface GlobalError {
  error: Error;
  isFatal: boolean;
  timestamp: Date;
}

interface UseGlobalErrorHandlerOptions {
  onError?: (error: GlobalError) => void;
  showAlerts?: boolean;
  logToConsole?: boolean;
}

/**
 * Hook to handle global errors and unhandled promise rejections
 */
export const useGlobalErrorHandler = (options: UseGlobalErrorHandlerOptions = {}) => {
  const {
    onError,
    showAlerts = env.NODE_ENV === 'development',
    logToConsole = true,
  } = options;

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      const globalError: GlobalError = {
        error,
        isFatal: false,
        timestamp: new Date(),
      };

      if (logToConsole) {
        console.error('Unhandled Promise Rejection:', error);
      }

      if (showAlerts) {
        Alert.alert(
          'Unexpected Error',
          `An error occurred: ${error.message}`,
          [{ text: 'OK' }]
        );
      }

      if (onError) {
        onError(globalError);
      }

      // Prevent the error from being logged to the console again
      event.preventDefault();
    };

    // Handle JavaScript errors (for development/debugging)
    const handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      
      const globalError: GlobalError = {
        error,
        isFatal: true,
        timestamp: new Date(),
      };

      if (logToConsole) {
        console.error('Global JavaScript Error:', error);
      }

      if (onError) {
        onError(globalError);
      }
    };

    // React Native specific error handler
    const originalHandler = global.ErrorUtils?.getGlobalHandler?.();

    const customErrorHandler = (error: Error, isFatal: boolean) => {
      const globalError: GlobalError = {
        error,
        isFatal,
        timestamp: new Date(),
      };

      if (logToConsole) {
        console.error('React Native Error:', error, 'isFatal:', isFatal);
      }

      if (showAlerts && !isFatal) {
        Alert.alert(
          'Error',
          error.message,
          [{ text: 'OK' }]
        );
      }

      if (onError) {
        onError(globalError);
      }

      // Call the original handler to maintain default behavior
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    };

    // Set up error handlers
    if (global.ErrorUtils?.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler(customErrorHandler);
    }

    // Add promise rejection handler (if available)
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleError);
    }

    // Cleanup function
    return () => {
      if (global.ErrorUtils?.setGlobalHandler && originalHandler) {
        global.ErrorUtils.setGlobalHandler(originalHandler);
      }

      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleError);
      }
    };
  }, [onError, showAlerts, logToConsole]);
};

/**
 * Utility function to manually report errors to the global error handler
 */
export const reportError = (error: Error, context?: string) => {
  if (context) {
    console.error(`Error in ${context}:`, error);
  } else {
    console.error('Reported Error:', error);
  }

  // In production, you might want to send this to a crash reporting service
  if (env.NODE_ENV === 'production') {
    // Example for future integration:
    // crashlytics().recordError(error);
    // Sentry.captureException(error, { tags: { context } });
  }
};

export default useGlobalErrorHandler;