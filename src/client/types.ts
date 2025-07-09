/**
 * Type definitions for the NVLP client library
 */

// Base configuration for client initialization
export interface NVLPClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  transport?: 'postgrest' | 'edge-function' | 'hybrid';
  timeout?: number;
  retries?: number;
  // Token persistence options
  persistTokens?: boolean; // Default: true
  tokenStorageKey?: string; // Default: 'nvlp_auth_tokens'
  autoRefresh?: boolean; // Default: true
  // Custom API endpoints
  apiBaseUrl?: string; // Default: derived from supabaseUrl, for Edge Functions (edge-api.nvlp.app)
  dbApiUrl?: string; // Custom URL for PostgREST operations (db-api.nvlp.app)
}

// Authentication state
export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: User | null;
  expiresIn?: number; // seconds until expiration
}

// Persisted auth data
export interface PersistedAuthData {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  user: User;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
}

// Transport interface for abstraction
export interface Transport {
  request<T>(
    method: string,
    endpoint: string, 
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>>;
}

// Request options
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: boolean;
}

// Standard API response format
export interface ApiResponse<T> {
  data: T;
  error: null;
  status: number;
} 

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
}

// Domain types matching database schema
export interface UserProfile {
  id: string;
  display_name: string;
  timezone: string;
  currency_code: string;
  date_format: string;
  default_budget_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeSource {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  expected_monthly_amount: number | null;
  should_notify: boolean;
  frequency: IncomeFrequency;
  custom_day: number | null;
  next_expected_date: string | null;
  created_at: string;
  updated_at: string;
}

export type IncomeFrequency = 
  | 'weekly'
  | 'bi_weekly'
  | 'twice_monthly'
  | 'monthly'
  | 'annually'
  | 'custom'
  | 'one_time';

export interface Category {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  category_type: CategoryType;
  is_system_category: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoryType = 'income' | 'expense' | 'transfer';

export interface Envelope {
  id: string;
  budget_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  current_balance: number;
  envelope_type: EnvelopeType;
  // Renamed notification fields
  notify_above_amount: number | null; // Also used as savings goal for savings envelopes
  notify_below_amount: number | null;
  should_notify: boolean;
  notify_date: string | null;
  // Debt-specific fields
  debt_balance: number;
  minimum_payment: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type EnvelopeType = 'regular' | 'savings' | 'debt';

export interface Payee {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  payee_type: PayeeType;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  preferred_payment_method: string | null;
  account_number: string | null;
  total_paid: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  created_at: string;
  updated_at: string;
}

export type PayeeType = 
  | 'business'
  | 'person' 
  | 'organization'
  | 'utility'
  | 'service'
  | 'other';

// Input types for creating/updating resources
export interface CreateBudgetInput {
  name: string;
  description?: string;
}

export interface UpdateBudgetInput {
  name?: string;
  description?: string;
  is_active?: boolean;
}

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

export interface CreateCategoryInput {
  budget_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  category_type?: CategoryType;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

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