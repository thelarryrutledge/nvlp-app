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
  budget_id: string;
  available_amount: number;
  total_income: number;
  total_allocated: number;
  total_spent: number;
  envelope_count: number;
  active_envelopes: number;
  negative_envelopes: number;
  recent_transactions: Transaction[];
}

import { Transaction } from '../models/transaction';