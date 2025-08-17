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

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Validate environment variables on app start
  React.useEffect(() => {
    validateEnv();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
