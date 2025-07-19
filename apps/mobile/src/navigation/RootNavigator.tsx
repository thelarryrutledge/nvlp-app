/**
 * Root Navigator
 * 
 * Main navigation controller that switches between authenticated and unauthenticated flows
 */

import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { LoadingScreen } from '../screens/LoadingScreen';
import { VerificationHandler } from '../screens/VerificationHandler';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V2'; // Changed to clear old state

// Deep linking configuration
const linking = {
  prefixes: ['nvlp://'],
  config: {
    screens: {
      AuthStack: {
        path: 'auth',
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          Verification: 'verify',
        },
      },
      MainStack: {
        path: 'app',
        screens: {
          MainTabs: 'home',
          Verification: 'verify',
        },
      },
    },
  },
};

export const RootNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [navigationIsReady, setNavigationIsReady] = useState(false);
  const [initialState, setInitialState] = useState<any>();

  useEffect(() => {
    const restoreState = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl == null) {
          // Only restore state if there's no deep link and we have a saved state
          // Temporarily disable state restoration to clear cached navigation
          // const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
          // const state = savedStateString ? JSON.parse(savedStateString) : undefined;

          // if (state !== undefined) {
          //   setInitialState(state);
          // }
        }
      } finally {
        setNavigationIsReady(true);
      }
    };

    if (!navigationIsReady) {
      restoreState();
    }
  }, [navigationIsReady]);

  if (!navigationIsReady || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      linking={linking}
      initialState={initialState}
      onStateChange={(state) =>
        AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))
      }
    >
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