/**
 * Budget and income source related types
 */

import { IncomeFrequency } from '../enums/financial';

export interface Budget {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeSource {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  expected_monthly_amount: number | null;
  should_notify: boolean;
  frequency: IncomeFrequency;
  custom_day: number | null;
  weekly_day: number | null;
  monthly_day: number | null;
  next_expected_date: string | null;
  created_at: string;
  updated_at: string;
}