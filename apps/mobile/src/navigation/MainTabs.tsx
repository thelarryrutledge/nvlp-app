/**
 * Main Tabs Navigator
 * 
 * Bottom tab navigation for main app features
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { EnhancedProfileScreen } from '../screens/profile/EnhancedProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screens - these will be replaced with actual screens later
const DashboardScreen = () => {
  const { logout } = useAuth();
  const { theme } = useTheme();
  
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.background }]}>
      <Text style={[styles.placeholderText, { color: theme.textPrimary }]}>Dashboard</Text>
      <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>Welcome! You're logged in.</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={() => logout()}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const BudgetsScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.background }]}>
      <Text style={[styles.placeholderText, { color: theme.textPrimary }]}>Budgets</Text>
      <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>Coming soon...</Text>
    </View>
  );
};

const EnvelopesScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.background }]}>
      <Text style={[styles.placeholderText, { color: theme.textPrimary }]}>Envelopes</Text>
      <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>Coming soon...</Text>
    </View>
  );
};

const TransactionsScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: theme.background }]}>
      <Text style={[styles.placeholderText, { color: theme.textPrimary }]}>Transactions</Text>
      <Text style={[styles.placeholderSubtext, { color: theme.textSecondary }]}>Coming soon...</Text>
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
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
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
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Transactions',
          tabBarLabel: 'Transactions',
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
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MainTabs;