export enum PayeeType {
  REGULAR = 'regular',
  DEBT = 'debt'
}

export interface Payee {
  id: string;
  budget_id: string;
  name: string;
  description?: string;
  payee_type: PayeeType;
  interest_rate?: number; // For debt payees (tracking only)
  minimum_payment?: number; // For debt payees (tracking only)  
  due_date?: number; // Day of month (1-31, tracking only)
  total_paid: number;
  last_payment_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayeeCreateRequest {
  name: string;
  description?: string;
  payee_type?: PayeeType;
  interest_rate?: number;
  minimum_payment?: number;
  due_date?: number;
}

export interface PayeeUpdateRequest {
  name?: string;
  description?: string;
  payee_type?: PayeeType;
  interest_rate?: number;
  minimum_payment?: number;
  due_date?: number;
  is_active?: boolean;
}