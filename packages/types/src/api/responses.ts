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

import { Transaction } from '../models/transaction';
import { Envelope } from '../models/envelope';