/**
 * Main Tabs Navigator
 * 
 * Bottom tab navigation for main app features
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screens - these will be replaced with actual screens later
const DashboardScreen = () => {
  const { logout } = useAuth();
  
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Dashboard</Text>
      <Text style={styles.placeholderSubtext}>Welcome! You're logged in.</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const BudgetsScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Budgets</Text>
    <Text style={styles.placeholderSubtext}>Coming soon...</Text>
  </View>
);

const EnvelopesScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Envelopes</Text>
    <Text style={styles.placeholderSubtext}>Coming soon...</Text>
  </View>
);

const TransactionsScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Transactions</Text>
    <Text style={styles.placeholderSubtext}>Coming soon...</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Profile</Text>
    <Text style={styles.placeholderSubtext}>Coming soon...</Text>
  </View>
);

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTitleStyle: {
          color: '#fff',
          fontWeight: '600',
        },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e1e5e9',
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
        component={ProfileScreen}
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
    backgroundColor: '#f8f9fa',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#666',
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