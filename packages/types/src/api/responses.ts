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

import { Transaction } from '../models/transaction';
import { Envelope } from '../models/envelope';