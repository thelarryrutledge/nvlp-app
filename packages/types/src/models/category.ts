export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  DEBT_PAYMENT = 'debt_payment'
}

export interface Category {
  id: string;
  budget_id: string;
  parent_id?: string; // Matches database schema
  name: string;
  description?: string;
  is_income: boolean; // Matches database schema
  is_system: boolean;
  display_order: number;
  total: number; // Cached total of envelope balances
  created_at: string;
  updated_at: string;
}

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  is_income?: boolean;
  is_system?: boolean;
  display_order?: number;
  parent_id?: string;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  is_income?: boolean;
  is_system?: boolean;
  display_order?: number;
  parent_id?: string;
}