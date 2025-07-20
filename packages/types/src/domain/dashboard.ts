/**
 * Dashboard data types
 */

export interface BudgetOverview {
  budget: {
    id: string;
    name: string;
    description: string | null;
  };
  available_amount: number;
  total_allocated: number;
  total_budget: number;
}

export interface EnvelopeSummary {
  id: string;
  name: string;
  balance: number;
  category: string | null;
}

export interface RecentTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer' | 'debt_payment';
  amount: number;
  description: string | null;
  date: string;
  from_envelope: string | null;
  to_envelope: string | null;
  payee: string | null;
  income_source: string | null;
}

export interface SpendingByCategory {
  category_id: string;
  category_name: string;
  amount: number;
}

export interface IncomeVsExpenses {
  period_days: number;
  total_income: number;
  total_expenses: number;
  total_debt_payments: number;
  net_flow: number;
}

export interface DashboardData {
  budget_overview: BudgetOverview;
  envelopes_summary: EnvelopeSummary[];
  recent_transactions: RecentTransaction[];
  spending_by_category: SpendingByCategory[];
  income_vs_expenses: IncomeVsExpenses;
  generated_at: string;
}