export interface IncomeSource {
  id: string;
  budget_id: string;
  name: string;
  description?: string;
  expected_amount?: number;
  frequency_days?: number;
  next_expected_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeSourceCreateRequest {
  name: string;
  description?: string;
  expected_amount?: number;
  frequency_days?: number;
  next_expected_date?: string;
}

export interface IncomeSourceUpdateRequest {
  name?: string;
  description?: string;
  expected_amount?: number;
  frequency_days?: number;
  next_expected_date?: string;
  is_active?: boolean;
}