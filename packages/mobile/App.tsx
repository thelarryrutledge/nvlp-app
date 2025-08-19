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
import { AuthProvider } from './src/contexts/AuthContext';
import DeepLinkService from './src/services/deepLinkService';

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
    
    // Initialize DeepLinkService immediately to catch initial URL
    console.log('🚀 Initializing DeepLinkService from App.tsx...');
    DeepLinkService.initialize().then(() => {
      console.log('✅ DeepLinkService initialized from App.tsx');
    }).catch(error => {
      console.error('❌ Failed to initialize DeepLinkService:', error);
    });
  }, []);


  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider autoInitialize={true} showAlerts={true}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
