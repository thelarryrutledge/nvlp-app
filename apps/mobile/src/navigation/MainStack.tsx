/**
 * Main Stack Navigator
 * 
 * Handles navigation for authenticated users
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { VerificationHandler } from '../screens/VerificationHandler';
import { DesignSystemExample } from '../screens/DesignSystemExample';
import { InitialBudgetSetupScreen } from '../screens/onboarding/InitialBudgetSetupScreen';
import { PermissionRequestScreen } from '../screens/onboarding/PermissionRequestScreen';
import { SessionTestScreen } from '../screens/developer/SessionTestScreen';
import { BudgetCreateScreen } from '../screens/budgets/BudgetCreateScreen';
import { BudgetEditScreen } from '../screens/budgets/BudgetEditScreen';
import { useTheme } from '../theme';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStack: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.primary,
        },
        headerTitleStyle: {
          color: theme.textOnPrimary,
          fontWeight: '600',
        },
        headerTintColor: theme.textOnPrimary,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          title: 'NVLP',
        }}
      />
      <Stack.Screen
        name="Verification"
        component={VerificationHandler}
        options={{
          title: 'Email Verification',
        }}
      />
      <Stack.Screen
        name="DesignSystemExample"
        component={DesignSystemExample}
        options={{
          headerShown: true,
          title: 'Design System',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="InitialBudgetSetup"
        component={InitialBudgetSetupScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="PermissionRequest"
        component={PermissionRequestScreen}
        options={{
          headerShown: true,
          title: 'Permissions',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="SessionTest"
        component={SessionTestScreen}
        options={{
          headerShown: true,
          title: 'Session Tests',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="BudgetCreate"
        component={BudgetCreateScreen}
        options={{
          headerShown: true,
          title: 'Create Budget',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="BudgetEdit"
        component={BudgetEditScreen}
        options={{
          headerShown: true,
          title: 'Edit Budget',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainStack;