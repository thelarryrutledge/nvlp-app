import { SupabaseClient } from '@supabase/supabase-js';
import { Database, DashboardSummary, SpendingStats, SpendingByCategory, SpendingByTime, IncomeStats, IncomeBySource, IncomeByTime, SpendingTrends, TrendData, CategoryTrend, ApiError, ErrorCode, Envelope, Transaction } from '@nvlp/types';
import { CachedBaseService } from './cached-base.service';
import { CACHE_NAMESPACE, CACHE_TTL } from '../utils/cache';

export class DashboardService extends CachedBaseService {
  constructor(client: SupabaseClient<Database>) {
    super(client);
  }

  async getDashboardSummary(budgetId: string): Promise<DashboardSummary> {
    const userId = await this.getCurrentUserId();
    const cacheKey = this.buildCacheKey(userId, budgetId);
    
    return this.withCache(
      CACHE_NAMESPACE.DASHBOARD,
      cacheKey,
      { ttl: CACHE_TTL.DASHBOARD },
      async () => this.withRetry(async () => {

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
      })
    );
  }

  async getSpendingStats(
    budgetId: string, 
    startDate: string, 
    endDate: string, 
    groupBy: 'day' | 'month' | 'year' = 'month'
  ): Promise<SpendingStats> {
    const userId = await this.getCurrentUserId();
    const cacheKey = this.buildCacheKey(userId, budgetId, startDate, endDate, groupBy);
    
    return this.withCache(
      CACHE_NAMESPACE.SPENDING_STATS,
      cacheKey,
      { ttl: CACHE_TTL.STATS },
      async () => this.withRetry(async () => {

      const { error: budgetError } = await this.client
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();

      if (budgetError) {
        this.handleError(budgetError);
      }

      const spendingTransactionTypes = ['expense', 'debt_payment'];

      const [categorySpendingResult, timeSpendingResult] = await Promise.all([
        this.client
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

        this.client
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

      const byCategory: SpendingByCategory[] = Array.from(categoryMap.entries()).map(([id, data]) => ({
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
            period = transaction.transaction_date.substring(0, 10); // YYYY-MM-DD
            break;
          case 'month':
            period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            break;
          case 'year':
            period = String(date.getFullYear()); // YYYY
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

      const byTime: SpendingByTime[] = Array.from(timeMap.entries()).map(([period, data]) => ({
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
      })
    );
  }

  async getIncomeStats(
    budgetId: string, 
    startDate: string, 
    endDate: string, 
    groupBy: 'day' | 'month' | 'year' = 'month'
  ): Promise<IncomeStats> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();

      const { error: budgetError } = await this.client
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();

      if (budgetError) {
        this.handleError(budgetError);
      }

      const [sourceIncomeResult, timeIncomeResult, incomeSourcesResult] = await Promise.all([
        this.client
          .from('transactions')
          .select(`
            amount,
            income_source_id,
            income_sources!income_source_id(name, expected_amount)
          `)
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .eq('transaction_type', 'income')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate),

        this.client
          .from('transactions')
          .select('amount, transaction_date')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .eq('transaction_type', 'income')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('transaction_date', { ascending: true }),

        this.client
          .from('income_sources')
          .select('id, name, expected_amount')
          .eq('budget_id', budgetId)
          .eq('is_active', true)
      ]);

      if (sourceIncomeResult.error) this.handleError(sourceIncomeResult.error);
      if (timeIncomeResult.error) this.handleError(timeIncomeResult.error);
      if (incomeSourcesResult.error) this.handleError(incomeSourcesResult.error);

      const sourceMap = new Map<string, { name: string; total: number; count: number; expected?: number }>();
      let totalIncome = 0;

      sourceIncomeResult.data?.forEach(transaction => {
        totalIncome += transaction.amount;
        const sourceId = transaction.income_source_id || 'unknown';
        const sourceName = (transaction.income_sources as any)?.name || 'Unknown Source';
        const expectedAmount = (transaction.income_sources as any)?.expected_amount;
        
        const existing = sourceMap.get(sourceId);
        if (existing) {
          existing.total += transaction.amount;
          existing.count += 1;
        } else {
          sourceMap.set(sourceId, {
            name: sourceName,
            total: transaction.amount,
            count: 1,
            expected: expectedAmount
          });
        }
      });

      const bySource: IncomeBySource[] = Array.from(sourceMap.entries()).map(([id, data]) => {
        const result: IncomeBySource = {
          income_source_id: id,
          income_source_name: data.name,
          total_amount: data.total,
          transaction_count: data.count
        };
        
        if (data.expected !== undefined) {
          result.expected_amount = data.expected;
          result.variance = data.total - data.expected;
        }
        
        return result;
      }).sort((a, b) => b.total_amount - a.total_amount);

      const timeMap = new Map<string, { total: number; count: number }>();
      
      timeIncomeResult.data?.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        let period: string;
        
        switch (groupBy) {
          case 'day':
            period = transaction.transaction_date.substring(0, 10); // YYYY-MM-DD
            break;
          case 'month':
            period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            break;
          case 'year':
            period = String(date.getFullYear()); // YYYY
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

      const byTime: IncomeByTime[] = Array.from(timeMap.entries()).map(([period, data]) => ({
        period,
        total_amount: data.total,
        transaction_count: data.count
      })).sort((a, b) => a.period.localeCompare(b.period));

      return {
        total_income: totalIncome,
        period_start: startDate,
        period_end: endDate,
        by_source: bySource,
        by_time: byTime
      };
    });
  }

  async getSpendingTrends(
    budgetId: string, 
    startDate: string, 
    endDate: string, 
    groupBy: 'month' | 'year' = 'month'
  ): Promise<SpendingTrends> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();

      const { error: budgetError } = await this.client
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', userId)
        .single();

      if (budgetError) {
        this.handleError(budgetError);
      }

      const [spendingResult, incomeResult] = await Promise.all([
        this.client
          .from('transactions')
          .select(`
            amount,
            transaction_date,
            category_id,
            categories!category_id(name)
          `)
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .in('transaction_type', ['expense', 'debt_payment'])
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('transaction_date', { ascending: true }),

        this.client
          .from('transactions')
          .select('amount, transaction_date')
          .eq('budget_id', budgetId)
          .eq('is_deleted', false)
          .eq('transaction_type', 'income')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('transaction_date', { ascending: true })
      ]);

      if (spendingResult.error) this.handleError(spendingResult.error);
      if (incomeResult.error) this.handleError(incomeResult.error);

      const overallTrendMap = new Map<string, { spending: number; income: number; transactionCount: number }>();
      const categoryTrendMap = new Map<string, { 
        name: string; 
        periodData: Map<string, number>; 
        total: number; 
        transactionCount: number;
      }>();

      spendingResult.data?.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const period = groupBy === 'month' 
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : String(date.getFullYear());

        const existing = overallTrendMap.get(period);
        if (existing) {
          existing.spending += transaction.amount;
          existing.transactionCount += 1;
        } else {
          overallTrendMap.set(period, {
            spending: transaction.amount,
            income: 0,
            transactionCount: 1
          });
        }

        const categoryId = transaction.category_id || 'uncategorized';
        const categoryName = (transaction.categories as any)?.name || 'Uncategorized';
        
        const categoryData = categoryTrendMap.get(categoryId);
        if (categoryData) {
          const periodSpending = categoryData.periodData.get(period) || 0;
          categoryData.periodData.set(period, periodSpending + transaction.amount);
          categoryData.total += transaction.amount;
          categoryData.transactionCount += 1;
        } else {
          const periodData = new Map<string, number>();
          periodData.set(period, transaction.amount);
          categoryTrendMap.set(categoryId, {
            name: categoryName,
            periodData,
            total: transaction.amount,
            transactionCount: 1
          });
        }
      });

      incomeResult.data?.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const period = groupBy === 'month' 
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : String(date.getFullYear());

        const existing = overallTrendMap.get(period);
        if (existing) {
          existing.income += transaction.amount;
        } else {
          overallTrendMap.set(period, {
            spending: 0,
            income: transaction.amount,
            transactionCount: 0
          });
        }
      });

      const overallTrend: TrendData[] = Array.from(overallTrendMap.entries())
        .map(([period, data]) => ({
          period,
          spending: data.spending,
          income: data.income,
          net_flow: data.income - data.spending,
          transaction_count: data.transactionCount
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      const calculateTrend = (periodData: Map<string, number>): { direction: 'increasing' | 'decreasing' | 'stable'; percentage: number } => {
        const periods = Array.from(periodData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        if (periods.length < 2) return { direction: 'stable', percentage: 0 };

        const firstHalf = periods.slice(0, Math.ceil(periods.length / 2));
        const secondHalf = periods.slice(Math.floor(periods.length / 2));

        const firstAvg = firstHalf.reduce((sum, [, amount]) => sum + amount, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, [, amount]) => sum + amount, 0) / secondHalf.length;

        if (firstAvg === 0) return { direction: 'stable', percentage: 0 };

        const percentage = ((secondAvg - firstAvg) / firstAvg) * 100;
        
        if (Math.abs(percentage) < 5) return { direction: 'stable', percentage };
        return { direction: percentage > 0 ? 'increasing' : 'decreasing', percentage };
      };

      const categoryTrends: CategoryTrend[] = Array.from(categoryTrendMap.entries())
        .map(([categoryId, data]) => {
          const trendData: TrendData[] = Array.from(overallTrendMap.keys())
            .sort()
            .map(period => ({
              period,
              spending: data.periodData.get(period) || 0,
              income: 0,
              net_flow: -(data.periodData.get(period) || 0),
              transaction_count: 0
            }));

          const trend = calculateTrend(data.periodData);
          const averageSpending = data.total / Math.max(data.periodData.size, 1);

          return {
            category_id: categoryId,
            category_name: data.name,
            trend_data: trendData,
            total_spending: data.total,
            average_spending: averageSpending,
            trend_direction: trend.direction,
            trend_percentage: trend.percentage
          };
        })
        .sort((a, b) => b.total_spending - a.total_spending);

      const topGrowing = categoryTrends
        .filter(cat => cat.trend_direction === 'increasing')
        .sort((a, b) => b.trend_percentage - a.trend_percentage)
        .slice(0, 5);

      const topDeclining = categoryTrends
        .filter(cat => cat.trend_direction === 'decreasing')
        .sort((a, b) => a.trend_percentage - b.trend_percentage)
        .slice(0, 5);

      return {
        period_start: startDate,
        period_end: endDate,
        overall_trend: overallTrend,
        category_trends: categoryTrends,
        top_growing_categories: topGrowing,
        top_declining_categories: topDeclining
      };
    });
  }
}