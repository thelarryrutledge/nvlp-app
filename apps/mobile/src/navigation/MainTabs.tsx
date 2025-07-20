/**
 * Main Tabs Navigator
 * 
 * Bottom tab navigation for main app features
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { EnhancedProfileScreen } from '../screens/profile/EnhancedProfileScreen';
import { BudgetListScreen } from '../screens/budgets/BudgetListScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { BudgetSwitcher } from '../components/budget';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screens - these will be replaced with actual screens later

// BudgetsScreen is now implemented as BudgetListScreen

const EnvelopesScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.background }]}>
      <Text style={[styles.placeholderText, { color: theme.textPrimary }]}>Envelopes</Text>
      <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>Coming soon...</Text>
      <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>Use the budget switcher above to select an active budget.</Text>
    </View>
  );
};

const TransactionsScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.background }]}>
      <Text style={[styles.placeholderText, { color: theme.textPrimary }]}>Transactions</Text>
      <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>Coming soon...</Text>
      <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>Use the budget switcher above to select an active budget.</Text>
    </View>
  );
};

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
        component={EnvelopesScreen}
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
        component={TransactionsScreen}
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

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor removed - using theme
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    // color removed - using theme
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    // color removed - using theme
    marginBottom: 32,
  },
});

export default MainTabs;