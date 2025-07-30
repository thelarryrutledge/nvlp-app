import { ApiError } from './errors';

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DashboardSummary {
  available_amount: number;
  total_envelope_balance: number;
  envelope_count: number;
  negative_envelope_count: number;
  recent_transactions_count: number;
  uncleared_transactions_count: number;
  month_to_date_spending: number;
  month_to_date_income: number;
  negative_envelopes: Envelope[];
  recent_transactions: Transaction[];
}

export interface SpendingByCategory {
  category_id: string;
  category_name: string;
  total_amount: number;
  transaction_count: number;
}

export interface SpendingByTime {
  period: string; // YYYY-MM-DD for daily, YYYY-MM for monthly, YYYY for yearly
  total_amount: number;
  transaction_count: number;
}

export interface SpendingStats {
  total_spending: number;
  period_start: string;
  period_end: string;
  by_category: SpendingByCategory[];
  by_time: SpendingByTime[];
}

export interface IncomeBySource {
  income_source_id: string;
  income_source_name: string;
  total_amount: number;
  transaction_count: number;
  expected_amount?: number;
  variance?: number;
}

export interface IncomeByTime {
  period: string; // YYYY-MM-DD for daily, YYYY-MM for monthly, YYYY for yearly
  total_amount: number;
  transaction_count: number;
}

export interface IncomeStats {
  total_income: number;
  period_start: string;
  period_end: string;
  by_source: IncomeBySource[];
  by_time: IncomeByTime[];
}

export interface TrendData {
  period: string;
  spending: number;
  income: number;
  net_flow: number;
  transaction_count: number;
}

export interface CategoryTrend {
  category_id: string;
  category_name: string;
  trend_data: TrendData[];
  total_spending: number;
  average_spending: number;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  trend_percentage: number;
}

export interface SpendingTrends {
  period_start: string;
  period_end: string;
  overall_trend: TrendData[];
  category_trends: CategoryTrend[];
  top_growing_categories: CategoryTrend[];
  top_declining_categories: CategoryTrend[];
}

export interface TransactionExportData {
  id: string;
  date: string;
  type: string;
  amount: number;
  description?: string;
  category?: string;
  from_envelope?: string;
  to_envelope?: string;
  payee?: string;
  income_source?: string;
  is_cleared: boolean;
  is_reconciled: boolean;
}

export interface ExportResponse {
  format: 'json' | 'csv';
  data: TransactionExportData[] | string;
  total_records: number;
  exported_at: string;
}

export interface BudgetSnapshotData {
  budget: {
    id: string;
    name: string;
    description?: string;
    currency: string;
    available_amount: number;
    is_active: boolean;
    created_at: string;
  };
  envelopes: {
    id: string;
    name: string;
    description?: string;
    current_balance: number;
    target_amount?: number;
    envelope_type: string;
    category?: string;
    display_order: number;
    notify_on_low_balance: boolean;
    low_balance_threshold?: number;
    is_active: boolean;
  }[];
  categories: {
    id: string;
    name: string;
    description?: string;
    parent_category?: string;
    is_income_category: boolean;
    display_order: number;
    is_active: boolean;
  }[];
  income_sources: {
    id: string;
    name: string;
    description?: string;
    expected_amount?: number;
    frequency?: string;
    next_expected_date?: string;
    is_active: boolean;
  }[];
  payees: {
    id: string;
    name: string;
    description?: string;
    default_category?: string;
    is_active: boolean;
  }[];
  summary: {
    total_envelope_balance: number;
    envelope_count: number;
    category_count: number;
    income_source_count: number;
    payee_count: number;
  };
}

export interface BudgetExportResponse {
  format: 'json' | 'csv';
  data: BudgetSnapshotData | string;
  exported_at: string;
}

import { Transaction } from '../models/transaction';
import { Envelope } from '../models/envelope';