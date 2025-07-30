import { SupabaseClient } from '@supabase/supabase-js';
import { Database, DashboardSummary, ApiError, ErrorCode, Envelope, Transaction } from '@nvlp/types';
import { BaseService } from './base.service';

export class DashboardService extends BaseService {
  constructor(client: SupabaseClient<Database>) {
    super(client);
  }

  async getDashboardSummary(budgetId: string): Promise<DashboardSummary> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();

      const { data: budget, error: budgetError } = await this.client
        .from('budgets')
        .select('available_amount')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();

      if (budgetError) {
        this.handleError(budgetError);
      }

      const currentDate = new Date();
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const [
        envelopesResult,
        negativeEnvelopesResult,
        recentTransactionsResult,
        unclearedTransactionsResult,
        monthlySpendingResult,
        monthlyIncomeResult
      ] = await Promise.all([
        this.client
          .from('envelopes')
          .select('current_balance')
          .eq('budget_id', budgetId)
          .eq('is_active', true),

        this.client
          .from('envelopes')
          .select('*')
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .lt('current_balance', 0)
          .order('current_balance', { ascending: true })
          .limit(5),

        this.client
          .from('transactions')
          .select('*')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10),

        this.client
          .from('transactions')
          .select('id')
          .eq('budget_id', budgetId)
          .eq('is_cleared', false)
          .eq('is_deleted', false),

        this.client
          .from('transactions')
          .select('amount')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .in('transaction_type', ['expense', 'debt_payment'])
          .gte('transaction_date', monthStart.toISOString().split('T')[0])
          .lte('transaction_date', monthEnd.toISOString().split('T')[0]),

        this.client
          .from('transactions')
          .select('amount')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .eq('transaction_type', 'income')
          .gte('transaction_date', monthStart.toISOString().split('T')[0])
          .lte('transaction_date', monthEnd.toISOString().split('T')[0])
      ]);

      if (envelopesResult.error) this.handleError(envelopesResult.error);
      if (negativeEnvelopesResult.error) this.handleError(negativeEnvelopesResult.error);
      if (recentTransactionsResult.error) this.handleError(recentTransactionsResult.error);
      if (unclearedTransactionsResult.error) this.handleError(unclearedTransactionsResult.error);
      if (monthlySpendingResult.error) this.handleError(monthlySpendingResult.error);
      if (monthlyIncomeResult.error) this.handleError(monthlyIncomeResult.error);

      const totalEnvelopeBalance = envelopesResult.data?.reduce(
        (sum, envelope) => sum + envelope.current_balance, 
        0
      ) || 0;

      const monthToDateSpending = monthlySpendingResult.data?.reduce(
        (sum, transaction) => sum + transaction.amount, 
        0
      ) || 0;

      const monthToDateIncome = monthlyIncomeResult.data?.reduce(
        (sum, transaction) => sum + transaction.amount, 
        0
      ) || 0;

      return {
        available_amount: budget.available_amount,
        total_envelope_balance: totalEnvelopeBalance,
        envelope_count: envelopesResult.data?.length || 0,
        negative_envelope_count: negativeEnvelopesResult.data?.length || 0,
        recent_transactions_count: recentTransactionsResult.data?.length || 0,
        uncleared_transactions_count: unclearedTransactionsResult.data?.length || 0,
        month_to_date_spending: monthToDateSpending,
        month_to_date_income: monthToDateIncome,
        negative_envelopes: negativeEnvelopesResult.data as Envelope[] || [],
        recent_transactions: recentTransactionsResult.data as Transaction[] || []
      };
    });
  }
}