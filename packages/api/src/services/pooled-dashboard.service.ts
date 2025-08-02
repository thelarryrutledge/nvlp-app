import { SupabaseConnectionPool } from '../config/connection-pool';
import { PooledBaseService } from './pooled-base.service';
import { DashboardSummary, SpendingStats, IncomeStats, SpendingTrends, Envelope, Transaction } from '@nvlp/types';

/**
 * Example implementation of DashboardService using connection pooling
 * This demonstrates how to convert existing services to use pooled connections
 */
export class PooledDashboardService extends PooledBaseService {
  constructor(pool: SupabaseConnectionPool) {
    super(pool);
  }

  async getDashboardSummary(budgetId: string): Promise<DashboardSummary> {
    const userId = await this.getCurrentUserId();
    
    return this.withRetry(async (client) => {
      const { data: budget, error: budgetError } = await client
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

      // Execute all dashboard queries in parallel using the same pooled connection
      const [
        envelopesResult,
        negativeEnvelopesResult,
        recentTransactionsResult,
        unclearedTransactionsResult,
        monthlySpendingResult,
        monthlyIncomeResult
      ] = await Promise.all([
        client
          .from('envelopes')
          .select('current_balance')
          .eq('budget_id', budgetId)
          .eq('is_active', true),

        client
          .from('envelopes')
          .select('*')
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .lt('current_balance', 0)
          .order('current_balance', { ascending: true })
          .limit(5),

        client
          .from('transactions')
          .select('*')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10),

        client
          .from('transactions')
          .select('id')
          .eq('budget_id', budgetId)
          .eq('is_cleared', false)
          .eq('is_deleted', false),

        client
          .from('transactions')
          .select('amount')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .in('transaction_type', ['expense', 'debt_payment'])
          .gte('transaction_date', monthStart.toISOString().split('T')[0])
          .lte('transaction_date', monthEnd.toISOString().split('T')[0]),

        client
          .from('transactions')
          .select('amount')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .eq('transaction_type', 'income')
          .gte('transaction_date', monthStart.toISOString().split('T')[0])
          .lte('transaction_date', monthEnd.toISOString().split('T')[0])
      ]);

      // Handle errors
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

  async getSpendingStats(
    budgetId: string, 
    startDate: string, 
    endDate: string, 
    groupBy: 'day' | 'month' | 'year' = 'month'
  ): Promise<SpendingStats> {
    const userId = await this.getCurrentUserId();
    
    return this.withRetry(async (client) => {
      const { error: budgetError } = await client
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();

      if (budgetError) {
        this.handleError(budgetError);
      }

      const spendingTransactionTypes = ['expense', 'debt_payment'];

      // Execute both queries in parallel using the same pooled connection
      const [categorySpendingResult, timeSpendingResult] = await Promise.all([
        client
          .from('transactions')
          .select(`
            amount,
            category_id,
            categories!category_id(name)
          `)
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .in('transaction_type', spendingTransactionTypes)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate),

        client
          .from('transactions')
          .select('amount, transaction_date')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .in('transaction_type', spendingTransactionTypes)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('transaction_date', { ascending: true })
      ]);

      if (categorySpendingResult.error) this.handleError(categorySpendingResult.error);
      if (timeSpendingResult.error) this.handleError(timeSpendingResult.error);

      // Process results (same logic as original service)
      const categoryMap = new Map<string, { name: string; total: number; count: number }>();
      let totalSpending = 0;

      categorySpendingResult.data?.forEach(transaction => {
        totalSpending += transaction.amount;
        const categoryId = transaction.category_id || 'uncategorized';
        const categoryName = (transaction.categories as any)?.name || 'Uncategorized';
        
        const existing = categoryMap.get(categoryId);
        if (existing) {
          existing.total += transaction.amount;
          existing.count += 1;
        } else {
          categoryMap.set(categoryId, {
            name: categoryName,
            total: transaction.amount,
            count: 1
          });
        }
      });

      const byCategory = Array.from(categoryMap.entries()).map(([id, data]) => ({
        category_id: id,
        category_name: data.name,
        total_amount: data.total,
        transaction_count: data.count
      })).sort((a, b) => b.total_amount - a.total_amount);

      const timeMap = new Map<string, { total: number; count: number }>();
      
      timeSpendingResult.data?.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        let period: string;
        
        switch (groupBy) {
          case 'day':
            period = transaction.transaction_date.substring(0, 10);
            break;
          case 'month':
            period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'year':
            period = String(date.getFullYear());
            break;
        }
        
        const existing = timeMap.get(period);
        if (existing) {
          existing.total += transaction.amount;
          existing.count += 1;
        } else {
          timeMap.set(period, {
            total: transaction.amount,
            count: 1
          });
        }
      });

      const byTime = Array.from(timeMap.entries()).map(([period, data]) => ({
        period,
        total_amount: data.total,
        transaction_count: data.count
      })).sort((a, b) => a.period.localeCompare(b.period));

      return {
        total_spending: totalSpending,
        period_start: startDate,
        period_end: endDate,
        by_category: byCategory,
        by_time: byTime
      };
    });
  }
}