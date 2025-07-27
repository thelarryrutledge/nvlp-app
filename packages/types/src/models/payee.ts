export interface Payee {
  id: string;
  budget_id: string;
  name: string;
  description?: string;
  total_paid: number;
  last_payment_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayeeCreateRequest {
  name: string;
  description?: string;
}

export interface PayeeUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}