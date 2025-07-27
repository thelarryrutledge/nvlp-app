export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  ALLOCATION = 'allocation',
  DEBT_PAYMENT = 'debt_payment'
}

export interface Transaction {
  id: string;
  budget_id: string;
  transaction_type: TransactionType;
  amount: number;
  description?: string;
  transaction_date: string;
  from_envelope_id?: string;
  to_envelope_id?: string;
  payee_id?: string;
  income_source_id?: string;
  category_id?: string;
  is_cleared: boolean;
  is_reconciled: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface TransactionCreateRequest {
  transaction_type: TransactionType;
  amount: number;
  description?: string;
  transaction_date: string;
  from_envelope_id?: string;
  to_envelope_id?: string;
  payee_id?: string;
  income_source_id?: string;
  category_id?: string;
  is_cleared?: boolean;
}

export interface TransactionUpdateRequest {
  amount?: number;
  description?: string;
  transaction_date?: string;
  from_envelope_id?: string;
  to_envelope_id?: string;
  payee_id?: string;
  income_source_id?: string;
  category_id?: string;
  is_cleared?: boolean;
  is_reconciled?: boolean;
}

export interface TransactionWithDetails extends Transaction {
  from_envelope?: Envelope;
  to_envelope?: Envelope;
  payee?: Payee;
  income_source?: IncomeSource;
  category?: Category;
}

import { Envelope } from './envelope';
import { Payee } from './payee';
import { IncomeSource } from './income';
import { Category } from './category';