/**
 * API request input types for creating and updating resources
 */

import { IncomeFrequency, CategoryType, EnvelopeType, PayeeType } from '../enums/financial';

// Budget operations
export interface CreateBudgetInput {
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateBudgetInput {
  name?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

// Income source operations
export interface CreateIncomeSourceInput {
  budget_id: string;
  name: string;
  description?: string;
  expected_monthly_amount?: number;
  should_notify?: boolean;
  frequency?: IncomeFrequency;
  custom_day?: number;
}

export interface UpdateIncomeSourceInput {
  name?: string;
  description?: string;
  expected_monthly_amount?: number;
  should_notify?: boolean;
  frequency?: IncomeFrequency;
  custom_day?: number;
  is_active?: boolean;
}

// Category operations
export interface CreateCategoryInput {
  budget_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  category_type?: CategoryType;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Envelope operations
export interface CreateEnvelopeInput {
  budget_id: string;
  category_id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  envelope_type?: EnvelopeType;
  notify_above_amount?: number; // Also used as savings goal for savings envelopes
  notify_below_amount?: number;
  should_notify?: boolean;
  notify_date?: string;
  // Debt-specific fields
  debt_balance?: number;
  minimum_payment?: number;
  due_date?: string;
  sort_order?: number;
}

export interface UpdateEnvelopeInput {
  name?: string;
  category_id?: string;
  description?: string;
  color?: string;
  icon?: string;
  envelope_type?: EnvelopeType;
  notify_above_amount?: number;
  notify_below_amount?: number;
  should_notify?: boolean;
  notify_date?: string;
  // Debt-specific fields
  debt_balance?: number;
  minimum_payment?: number;
  due_date?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Payee operations
export interface CreatePayeeInput {
  budget_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  payee_type?: PayeeType;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  preferred_payment_method?: string;
  account_number?: string;
  sort_order?: number;
}

export interface UpdatePayeeInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  payee_type?: PayeeType;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  preferred_payment_method?: string;
  account_number?: string;
  sort_order?: number;
  is_active?: boolean;
}

// Query parameters for filtering and pagination
export interface QueryParams {
  select?: string;
  limit?: number;
  offset?: number;
  order?: string;
  [key: string]: any; // For dynamic filters like name=eq.value
}