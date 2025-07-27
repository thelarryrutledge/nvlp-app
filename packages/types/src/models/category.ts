export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  DEBT_PAYMENT = 'debt_payment'
}

export interface Category {
  id: string;
  budget_id: string;
  name: string;
  description?: string;
  category_type: CategoryType;
  parent_category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  category_type: CategoryType;
  parent_category_id?: string;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  category_type?: CategoryType;
  parent_category_id?: string;
  is_active?: boolean;
}