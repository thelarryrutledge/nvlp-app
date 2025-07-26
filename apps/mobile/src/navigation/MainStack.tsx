/**
 * Main Stack Navigator
 * 
 * Handles navigation for authenticated users
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
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
import { CategoryFormScreen } from '../screens/categories/CategoryFormScreen';
import { IncomeSourceListScreen } from '../screens/income/IncomeSourceListScreen';
import { IncomeSourceFormScreen } from '../screens/income/IncomeSourceFormScreen';
import { IncomeCalendarScreen } from '../screens/income/IncomeCalendarScreen';
import { IncomeHistoryScreen } from '../screens/income/IncomeHistoryScreen';
import { EnvelopeDetailScreen, EnvelopeFormScreen, EnvelopeFundingScreen, EnvelopeTransferScreen, EnvelopeNotificationsScreen, EnvelopeHistoryScreen } from '../screens/envelope';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { PayeeListScreen, PayeeDetailScreen, PayeeFormScreen, PayeeMergeScreen, PayeeHistoryScreen, PayeeInsightsScreen } from '../screens/payees';
import { QuickTransactionEntryScreen, TransactionFormScreen, TransactionListScreen } from '../screens/transaction';
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
        name="CategoryForm"
        component={CategoryFormScreen}
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.categoryId ? 'Edit Category' : 'Add Category',
          headerBackTitle: 'Back',
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="IncomeSourceList"
        component={IncomeSourceListScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Income Sources',
          headerBackTitle: 'Back',
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: -8 }}>
              <TouchableOpacity
                style={{ padding: 8, marginRight: 4 }}
                onPress={() => navigation.navigate('IncomeCalendar' as never)}
              >
                <Icon name="calendar-outline" size={24} color="#059669" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={() => navigation.navigate('IncomeHistory' as never)}
              >
                <Icon name="analytics-outline" size={24} color="#059669" />
              </TouchableOpacity>
            </View>
          ),
        })}
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
      <Stack.Screen
        name="IncomeHistory"
        component={IncomeHistoryScreen}
        options={{
          headerShown: true,
          title: 'Income History',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="EnvelopeDetail"
        component={EnvelopeDetailScreen}
        options={{
          headerShown: true,
          title: 'Envelope Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="EnvelopeForm"
        component={EnvelopeFormScreen}
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.envelopeId ? 'Edit Envelope' : 'Add Envelope',
          headerBackTitle: 'Back',
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="EnvelopeFunding"
        component={EnvelopeFundingScreen}
        options={{
          headerShown: true,
          title: 'Fund Envelope',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="EnvelopeTransfer"
        component={EnvelopeTransferScreen}
        options={{
          headerShown: true,
          title: 'Transfer Funds',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="EnvelopeNotifications"
        component={EnvelopeNotificationsScreen}
        options={{
          headerShown: true,
          title: 'Notification Settings',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="EnvelopeHistory"
        component={EnvelopeHistoryScreen}
        options={{
          headerShown: true,
          title: 'Transaction History',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerShown: true,
          title: 'Notification Settings',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="PayeeList"
        component={PayeeListScreen}
        options={{
          headerShown: true,
          title: 'Payees',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="PayeeDetail"
        component={PayeeDetailScreen}
        options={{
          headerShown: true,
          title: 'Payee Details',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="PayeeForm"
        component={PayeeFormScreen}
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.payeeId ? 'Edit Payee' : 'Add Payee',
          headerBackTitle: 'Back',
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="PayeeMerge"
        component={PayeeMergeScreen}
        options={{
          headerShown: true,
          title: 'Merge Payee',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="PayeeHistory"
        component={PayeeHistoryScreen}
        options={{
          headerShown: true,
          title: 'Spending History',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="PayeeInsights"
        component={PayeeInsightsScreen}
        options={{
          headerShown: true,
          title: 'Spending Insights',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="QuickTransactionEntry"
        component={QuickTransactionEntryScreen}
        options={{
          headerShown: true,
          title: 'Quick Transaction',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="TransactionForm"
        component={TransactionFormScreen}
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.transactionId ? 'Edit Transaction' : 'New Transaction',
          headerBackTitle: 'Back',
          presentation: 'modal',
        })}
      />
      <Stack.Screen
        name="TransactionList"
        component={TransactionListScreen}
        options={{
          headerShown: true,
          title: 'Transactions',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainStack;