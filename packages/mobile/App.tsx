/**
 * NVLP - Virtual Envelope Budgeting System
 * React Native Mobile App
 */

import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { validateEnv } from './src/config/env';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useGlobalErrorHandler } from './src/hooks/useGlobalErrorHandler';
import ErrorHandlingService from './src/services/errorHandlingService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Set up global error handling
  useGlobalErrorHandler({
    onError: (globalError) => {
      ErrorHandlingService.reportGlobalError(
        globalError.error, 
        globalError.isFatal
      );
    },
  });

  // Validate environment variables on app start
  React.useEffect(() => {
    validateEnv();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
