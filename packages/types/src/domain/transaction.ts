/**
 * Transaction-related types for the NVLP application
 */

export type TransactionType = 
  | 'income'
  | 'allocation' 
  | 'expense'
  | 'transfer'
  | 'debt_payment';

export type NotificationType =
  | 'income_source_due'
  | 'income_source_overdue'
  | 'envelope_date_due'
  | 'envelope_amount_threshold'
  | 'envelope_overbudget'
  | 'transaction_uncleared';

export type AuditEventType =
  | 'transaction_created'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'envelope_created'
  | 'envelope_updated'
  | 'envelope_deleted'
  | 'budget_created'
  | 'budget_updated'
  | 'category_created'
  | 'category_updated'
  | 'payee_created'
  | 'payee_updated';

export interface Transaction {
  id: string;
  budget_id: string;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  is_cleared: boolean;
  from_envelope_id: string | null;
  to_envelope_id: string | null;
  payee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationData {
  id: string;
  user_id: string;
  budget_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  related_entity_type: string;
  related_entity_id: string;
  notification_date: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  user_id: string;
  budget_id: string;
  event_type: AuditEventType;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  timestamp: string;
  user_agent: string | null;
  ip_address: string | null;
}