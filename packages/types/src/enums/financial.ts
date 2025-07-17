/**
 * Financial enumeration types and constants
 */

export type IncomeFrequency = 
  | 'weekly'
  | 'bi_weekly'
  | 'twice_monthly'
  | 'monthly'
  | 'annually'
  | 'custom'
  | 'one_time';

export type CategoryType = 'income' | 'expense' | 'transfer';

export type EnvelopeType = 'regular' | 'savings' | 'debt';

export type PayeeType = 
  | 'business'
  | 'person' 
  | 'organization'
  | 'utility'
  | 'service'
  | 'other';