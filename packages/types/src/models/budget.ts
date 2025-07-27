export interface Budget {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  available_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetCreateRequest {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface BudgetUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}