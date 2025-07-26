/**
 * Main Tabs Navigator
 * 
 * Bottom tab navigation for main app features
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { EnhancedProfileScreen } from '../screens/profile/EnhancedProfileScreen';
import { BudgetListScreen } from '../screens/budgets/BudgetListScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { EnvelopeListScreen } from '../screens/envelope';
import { TransactionListScreen } from '../screens/transaction';
import { BudgetSwitcher } from '../components/budget';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// All main screens are now implemented

export const MainTabs: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.primary,
        },
        headerTitleStyle: {
          color: theme.textOnPrimary,
          fontWeight: '600',
        },
        headerTintColor: theme.textOnPrimary,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <BudgetSwitcher variant="header" showLabel={false} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetListScreen}
        options={{
          title: 'Budgets',
          tabBarLabel: 'Budgets',
        }}
      />
      <Tab.Screen
        name="Envelopes"
        component={EnvelopeListScreen}
        options={{
          title: 'Envelopes',
          tabBarLabel: 'Envelopes',
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <BudgetSwitcher variant="header" showLabel={false} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionListScreen}
        options={{
          title: 'Transactions',
          tabBarLabel: 'Transactions',
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <BudgetSwitcher variant="header" showLabel={false} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={EnhancedProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;