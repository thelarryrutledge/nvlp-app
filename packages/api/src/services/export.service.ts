import { SupabaseClient } from '@supabase/supabase-js';
import { Database, ExportResponse, TransactionExportData, BudgetExportResponse, BudgetSnapshotData, ApiError, ErrorCode } from '@nvlp/types';
import { BaseService } from './base.service';

export class ExportService extends BaseService {
  constructor(client: SupabaseClient<Database>) {
    super(client);
  }

  async exportTransactions(
    budgetId: string,
    format: 'json' | 'csv' = 'json',
    startDate?: string,
    endDate?: string,
    transactionType?: string
  ): Promise<ExportResponse> {
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

      let query = this.client
        .from('transactions')
        .select(`
          id,
          transaction_type,
          amount,
          description,
          transaction_date,
          is_cleared,
          is_reconciled,
          categories:categories(name),
          from_envelope:envelopes!from_envelope_id(name),
          to_envelope:envelopes!to_envelope_id(name),
          payees:payees(name),
          income_sources:income_sources(name)
        `)
        .eq('budget_id', budgetId)
        .eq('is_deleted', false)
        .order('transaction_date', { ascending: false });

      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }

      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }

      if (transactionType) {
        query = query.eq('transaction_type', transactionType);
      }

      const { data: transactions, error } = await query;

      if (error) {
        this.handleError(error);
      }

      const exportData: TransactionExportData[] = transactions?.map(transaction => ({
        id: transaction.id,
        date: transaction.transaction_date,
        type: transaction.transaction_type,
        amount: transaction.amount,
        description: transaction.description || undefined,
        category: (transaction.categories as any)?.name || undefined,
        from_envelope: (transaction.from_envelope as any)?.name || undefined,
        to_envelope: (transaction.to_envelope as any)?.name || undefined,
        payee: (transaction.payees as any)?.name || undefined,
        income_source: (transaction.income_sources as any)?.name || undefined,
        is_cleared: transaction.is_cleared,
        is_reconciled: transaction.is_reconciled
      })) || [];

      const exportedAt = new Date().toISOString();

      if (format === 'csv') {
        const csvData = this.convertToCSV(exportData);
        return {
          format: 'csv',
          data: csvData,
          total_records: exportData.length,
          exported_at: exportedAt
        };
      }

      return {
        format: 'json',
        data: exportData,
        total_records: exportData.length,
        exported_at: exportedAt
      };
    });
  }

  private convertToCSV(data: TransactionExportData[]): string {
    if (data.length === 0) {
      return '';
    }

    const headers = [
      'ID',
      'Date',
      'Type',
      'Amount',
      'Description',
      'Category',
      'From Envelope',
      'To Envelope',
      'Payee',
      'Income Source',
      'Is Cleared',
      'Is Reconciled'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(transaction => [
        transaction.id,
        transaction.date,
        transaction.type,
        transaction.amount.toString(),
        this.escapeCsvField(transaction.description || ''),
        this.escapeCsvField(transaction.category || ''),
        this.escapeCsvField(transaction.from_envelope || ''),
        this.escapeCsvField(transaction.to_envelope || ''),
        this.escapeCsvField(transaction.payee || ''),
        this.escapeCsvField(transaction.income_source || ''),
        transaction.is_cleared.toString(),
        transaction.is_reconciled.toString()
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  async exportBudgetSnapshot(
    budgetId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<BudgetExportResponse> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();

      const [
        budgetResult,
        envelopesResult,
        categoriesResult,
        incomeSourcesResult,
        payeesResult
      ] = await Promise.all([
        this.client
          .from('budgets')
          .select('*')
          .eq('id', budgetId)
          .eq('user_id', userId)
          .single(),

        this.client
          .from('envelopes')
          .select(`
            *,
            categories:categories(name)
          `)
          .eq('budget_id', budgetId)
          .order('display_order', { ascending: true }),

        this.client
          .from('categories')
          .select(`
            *,
            parent_category:categories!parent_category_id(name)
          `)
          .eq('budget_id', budgetId)
          .order('display_order', { ascending: true }),

        this.client
          .from('income_sources')
          .select('*')
          .eq('budget_id', budgetId)
          .order('name', { ascending: true }),

        this.client
          .from('payees')
          .select(`
            *,
            categories:categories!default_category_id(name)
          `)
          .eq('budget_id', budgetId)
          .order('name', { ascending: true })
      ]);

      if (budgetResult.error) this.handleError(budgetResult.error);
      if (envelopesResult.error) this.handleError(envelopesResult.error);
      if (categoriesResult.error) this.handleError(categoriesResult.error);
      if (incomeSourcesResult.error) this.handleError(incomeSourcesResult.error);
      if (payeesResult.error) this.handleError(payeesResult.error);

      const budget = budgetResult.data;
      const envelopes = envelopesResult.data || [];
      const categories = categoriesResult.data || [];
      const incomeSources = incomeSourcesResult.data || [];
      const payees = payeesResult.data || [];

      const totalEnvelopeBalance = envelopes.reduce((sum, env) => sum + env.current_balance, 0);

      const snapshotData: BudgetSnapshotData = {
        budget: {
          id: budget.id,
          name: budget.name,
          description: budget.description || undefined,
          currency: budget.currency,
          available_amount: budget.available_amount,
          is_active: budget.is_active,
          created_at: budget.created_at
        },
        envelopes: envelopes.map(env => ({
          id: env.id,
          name: env.name,
          description: env.description || undefined,
          current_balance: env.current_balance,
          target_amount: env.target_amount || undefined,
          envelope_type: env.envelope_type,
          category: (env.categories as any)?.name || undefined,
          display_order: env.display_order,
          notify_on_low_balance: env.notify_on_low_balance,
          low_balance_threshold: env.low_balance_threshold || undefined,
          is_active: env.is_active
        })),
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || undefined,
          parent_category: (cat.parent_category as any)?.name || undefined,
          is_income_category: cat.is_income_category,
          display_order: cat.display_order,
          is_active: cat.is_active
        })),
        income_sources: incomeSources.map(source => ({
          id: source.id,
          name: source.name,
          description: source.description || undefined,
          expected_amount: source.expected_amount || undefined,
          frequency: source.frequency || undefined,
          next_expected_date: source.next_expected_date || undefined,
          is_active: source.is_active
        })),
        payees: payees.map(payee => ({
          id: payee.id,
          name: payee.name,
          description: payee.description || undefined,
          default_category: (payee.categories as any)?.name || undefined,
          is_active: payee.is_active
        })),
        summary: {
          total_envelope_balance: totalEnvelopeBalance,
          envelope_count: envelopes.length,
          category_count: categories.length,
          income_source_count: incomeSources.length,
          payee_count: payees.length
        }
      };

      const exportedAt = new Date().toISOString();

      if (format === 'csv') {
        const csvData = this.convertBudgetToCSV(snapshotData);
        return {
          format: 'csv',
          data: csvData,
          exported_at: exportedAt
        };
      }

      return {
        format: 'json',
        data: snapshotData,
        exported_at: exportedAt
      };
    });
  }

  private convertBudgetToCSV(data: BudgetSnapshotData): string {
    const sections: string[] = [];

    sections.push('BUDGET INFORMATION');
    sections.push('Name,Description,Currency,Available Amount,Is Active,Created At');
    sections.push([
      this.escapeCsvField(data.budget.name),
      this.escapeCsvField(data.budget.description || ''),
      data.budget.currency,
      data.budget.available_amount.toString(),
      data.budget.is_active.toString(),
      data.budget.created_at
    ].join(','));

    sections.push('');
    sections.push('ENVELOPES');
    sections.push('ID,Name,Description,Current Balance,Target Amount,Type,Category,Display Order,Notify Low Balance,Low Balance Threshold,Is Active');
    data.envelopes.forEach(env => {
      sections.push([
        env.id,
        this.escapeCsvField(env.name),
        this.escapeCsvField(env.description || ''),
        env.current_balance.toString(),
        (env.target_amount || '').toString(),
        env.envelope_type,
        this.escapeCsvField(env.category || ''),
        env.display_order.toString(),
        env.notify_on_low_balance.toString(),
        (env.low_balance_threshold || '').toString(),
        env.is_active.toString()
      ].join(','));
    });

    sections.push('');
    sections.push('CATEGORIES');
    sections.push('ID,Name,Description,Parent Category,Is Income Category,Display Order,Is Active');
    data.categories.forEach(cat => {
      sections.push([
        cat.id,
        this.escapeCsvField(cat.name),
        this.escapeCsvField(cat.description || ''),
        this.escapeCsvField(cat.parent_category || ''),
        cat.is_income_category.toString(),
        cat.display_order.toString(),
        cat.is_active.toString()
      ].join(','));
    });

    sections.push('');
    sections.push('INCOME SOURCES');
    sections.push('ID,Name,Description,Expected Amount,Frequency,Next Expected Date,Is Active');
    data.income_sources.forEach(source => {
      sections.push([
        source.id,
        this.escapeCsvField(source.name),
        this.escapeCsvField(source.description || ''),
        (source.expected_amount || '').toString(),
        this.escapeCsvField(source.frequency || ''),
        source.next_expected_date || '',
        source.is_active.toString()
      ].join(','));
    });

    sections.push('');
    sections.push('PAYEES');
    sections.push('ID,Name,Description,Default Category,Is Active');
    data.payees.forEach(payee => {
      sections.push([
        payee.id,
        this.escapeCsvField(payee.name),
        this.escapeCsvField(payee.description || ''),
        this.escapeCsvField(payee.default_category || ''),
        payee.is_active.toString()
      ].join(','));
    });

    sections.push('');
    sections.push('SUMMARY');
    sections.push('Total Envelope Balance,Envelope Count,Category Count,Income Source Count,Payee Count');
    sections.push([
      data.summary.total_envelope_balance.toString(),
      data.summary.envelope_count.toString(),
      data.summary.category_count.toString(),
      data.summary.income_source_count.toString(),
      data.summary.payee_count.toString()
    ].join(','));

    return sections.join('\n');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}