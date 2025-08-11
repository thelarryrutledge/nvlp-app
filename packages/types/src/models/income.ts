// Schedule Types
export type ScheduleType = 
  | 'weekly'          // Every week on specific day
  | 'biweekly'        // Every 2 weeks on specific day  
  | 'monthly'         // Monthly on specific date
  | 'semi_monthly'    // Twice per month on specific dates
  | 'quarterly'       // Every 3 months on specific date
  | 'yearly'          // Annually on specific date
  | 'one_time'        // Single occurrence

export interface WeeklyConfig {
  day_of_week: number;  // 0=Sunday, 1=Monday, ..., 6=Saturday
}

export interface BiweeklyConfig {
  day_of_week: number;  // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_date: string;   // ISO date to anchor the pattern
}

export interface MonthlyConfig {
  day_of_month: number; // 1-31, or -1 for last day of month
}

export interface SemiMonthlyConfig {
  pay_dates: number[];  // [1, 15] or [15, -1], etc.
}

export interface QuarterlyConfig {
  month_of_quarter: number; // 1, 2, or 3 (Jan/Apr/Jul/Oct, Feb/May/Aug/Nov, or Mar/Jun/Sep/Dec)
  day_of_month: number;     // 1-31, or -1 for last day
}

export interface YearlyConfig {
  month: number;        // 1-12
  day_of_month: number; // 1-31, or -1 for last day
}

export interface OneTimeConfig {
  date: string;         // ISO date string
}

export type ScheduleConfig = 
  | WeeklyConfig
  | BiweeklyConfig  
  | MonthlyConfig
  | SemiMonthlyConfig
  | QuarterlyConfig
  | YearlyConfig
  | OneTimeConfig;

export interface IncomeSource {
  id: string;
  budget_id: string;
  name: string;
  description?: string;
  expected_amount?: number;
  schedule_type?: ScheduleType;
  schedule_config?: ScheduleConfig;
  next_expected_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeSourceCreateRequest {
  name: string;
  description?: string;
  expected_amount?: number;
  schedule_type?: ScheduleType;
  schedule_config?: ScheduleConfig;
  next_expected_date?: string;
}

export interface IncomeSourceUpdateRequest {
  name?: string;
  description?: string;
  expected_amount?: number;
  schedule_type?: ScheduleType;
  schedule_config?: ScheduleConfig;
  next_expected_date?: string;
  is_active?: boolean;
}