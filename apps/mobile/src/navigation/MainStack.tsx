/**
 * Main Stack Navigator
 * 
 * Handles navigation for authenticated users
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { VerificationHandler } from '../screens/VerificationHandler';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
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
    </Stack.Navigator>
  );
};

export default MainStack;