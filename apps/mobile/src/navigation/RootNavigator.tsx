/**
 * Root Navigator
 * 
 * Main navigation controller that switches between authenticated and unauthenticated flows
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { LoadingScreen } from '../screens/LoadingScreen';
import { VerificationHandler } from '../screens/VerificationHandler';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['nvlp://'],
  config: {
    screens: {
      AuthStack: {
        screens: {
          Verification: 'verify',
        },
      },
      MainStack: {
        screens: {
          Verification: 'verify',
        },
      },
    },
  },
};

export const RootNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {user ? (
          <>
            <Stack.Screen
              name="MainStack"
              component={MainStack}
              options={{
                animationTypeForReplace: 'push',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="AuthStack"
              component={AuthStack}
              options={{
                animationTypeForReplace: 'pop',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;