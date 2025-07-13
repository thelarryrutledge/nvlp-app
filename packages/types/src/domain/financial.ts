/**
 * Financial entities: categories, envelopes, and payees
 */

import { CategoryType, EnvelopeType, PayeeType } from '../enums/financial';

export interface Category {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  category_type: CategoryType;
  is_system_category: boolean;
  created_at: string;
  updated_at: string;
}

export interface Envelope {
  id: string;
  budget_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  current_balance: number;
  envelope_type: EnvelopeType;
  // Renamed notification fields
  notify_above_amount: number | null; // Also used as savings goal for savings envelopes
  notify_below_amount: number | null;
  should_notify: boolean;
  notify_date: string | null;
  // Debt-specific fields
  debt_balance: number;
  minimum_payment: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payee {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  payee_type: PayeeType;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  preferred_payment_method: string | null;
  account_number: string | null;
  total_paid: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  created_at: string;
  updated_at: string;
}