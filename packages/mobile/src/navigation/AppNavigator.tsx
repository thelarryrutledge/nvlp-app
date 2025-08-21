import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthContext } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import BudgetScreen from '../screens/BudgetScreen';
import TransactionScreen from '../screens/TransactionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActiveSessionsScreen from '../screens/ActiveSessionsScreen';

export type RootTabParamList = {
  Home: undefined;
  Budget: undefined;
  Transactions: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  TransactionDetail: { transactionId: string };
  EnvelopeDetail: { envelopeId: string };
  ActiveSessions: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  ActiveSessions: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();

const SettingsStackNavigator = () => {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e1e4e8',
        },
        headerTintColor: '#333',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <SettingsStack.Screen
        name="ActiveSessions"
        component={ActiveSessionsScreen}
        options={{
          title: 'Active Sessions',
          headerBackTitle: 'Settings',
        }}
      />
    </SettingsStack.Navigator>
  );
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          tabBarLabel: 'Envelopes',
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionScreen}
        options={{
          tabBarLabel: 'Transactions',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isInitialized } = useAuthContext();

  // Don't render navigation until auth is initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ 
              headerShown: true,
              title: 'Sign In',
              headerStyle: {
                backgroundColor: '#007AFF',
              },
              headerTintColor: '#FFF',
            }}
          />
        ) : (
          // Main App Stack
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;