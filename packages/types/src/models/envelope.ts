export enum EnvelopeType {
  REGULAR = 'regular',
  DEBT = 'debt',
  SAVINGS = 'savings'
}

export interface Envelope {
  id: string;
  budget_id: string;
  name: string;
  description?: string;
  current_balance: number;
  target_amount?: number;
  envelope_type: EnvelopeType;
  category_id?: string;
  display_order: number;
  notify_on_low_balance: boolean;
  low_balance_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnvelopeCreateRequest {
  name: string;
  description?: string;
  target_amount?: number;
  envelope_type?: EnvelopeType;
  category_id?: string;
  display_order?: number; // Optional - will auto-assign if not provided
  notify_on_low_balance?: boolean;
  low_balance_threshold?: number;
}

export interface EnvelopeUpdateRequest {
  name?: string;
  description?: string;
  target_amount?: number;
  envelope_type?: EnvelopeType;
  category_id?: string;
  display_order?: number;
  notify_on_low_balance?: boolean;
  low_balance_threshold?: number;
  is_active?: boolean;
}

export interface EnvelopeReorderRequest {
  id: string;
  display_order: number;
}