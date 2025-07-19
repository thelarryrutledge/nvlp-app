/**
 * Authentication Stack Navigator
 * 
 * Handles navigation between authentication screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { VerificationHandler } from '../screens/VerificationHandler';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  const { registrationSuccess } = useAuth();
  
  // If we have a registration success, start on Register screen to show success message
  const initialRoute = registrationSuccess ? "Register" : "Login";
  
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Sign In',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'Create Account',
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
        }}
      />
      <Stack.Screen
        name="Verification"
        component={VerificationHandler}
        options={{
          title: 'Email Verification',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;