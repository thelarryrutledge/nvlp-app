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

import { Transaction } from '../models/transaction';
import { Envelope } from '../models/envelope';