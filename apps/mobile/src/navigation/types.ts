/**
 * Navigation Type Definitions
 * 
 * TypeScript definitions for React Navigation
 */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  Verification: {
    token?: string;
    type?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
};

export type MainStackParamList = {
  MainTabs: undefined;
  Verification: {
    token?: string;
    type?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  DesignSystemExample: undefined;
  InitialBudgetSetup: undefined;
  PermissionRequest: undefined;
  SessionTest: undefined;
  BudgetCreate: undefined;
  BudgetEdit: { budgetId: string };
  BudgetSettings: { budgetId: string };
  CategoryList: undefined;
  CategoryForm: { categoryId?: string; categoryType?: string };
  IncomeSourceList: undefined;
  IncomeSourceForm: { incomeSourceId?: string };
  IncomeCalendar: undefined;
  IncomeHistory: undefined;
  EnvelopeDetail: { envelopeId: string };
  EnvelopeForm: { envelopeId?: string };
  EnvelopeFunding: { envelopeId: string };
  EnvelopeTransfer: { envelopeId: string };
  NotificationSettings: undefined;
  // Add other main app screens here
};

export type MainTabParamList = {
  Dashboard: undefined;
  Budgets: undefined;
  Envelopes: undefined;
  Transactions: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  AuthStack: undefined;
  MainStack: undefined;
};

// Navigation prop types for convenience
export type AuthScreenNavigationProp = any; // Will be defined specifically per screen
export type MainScreenNavigationProp = any; // Will be defined specifically per screen