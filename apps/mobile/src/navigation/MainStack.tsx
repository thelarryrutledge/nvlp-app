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
import { BudgetSettingsScreen } from '../screens/budgets/BudgetSettingsScreen';
import { CategoryListScreen } from '../screens/categories/CategoryListScreen';
import { IncomeSourceListScreen } from '../screens/income/IncomeSourceListScreen';
import { IncomeSourceFormScreen } from '../screens/income/IncomeSourceFormScreen';
import { IncomeCalendarScreen } from '../screens/income/IncomeCalendarScreen';
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
      <Stack.Screen
        name="BudgetSettings"
        component={BudgetSettingsScreen}
        options={{
          headerShown: true,
          title: 'Budget Settings',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="CategoryList"
        component={CategoryListScreen}
        options={{
          headerShown: true,
          title: 'Categories',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="IncomeSourceList"
        component={IncomeSourceListScreen}
        options={{
          headerShown: true,
          title: 'Income Sources',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="IncomeSourceForm"
        component={IncomeSourceFormScreen}
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.incomeSourceId ? 'Edit Income Source' : 'Add Income Source',
          headerBackTitle: 'Back',
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="IncomeCalendar"
        component={IncomeCalendarScreen}
        options={{
          headerShown: true,
          title: 'Income Calendar',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainStack;