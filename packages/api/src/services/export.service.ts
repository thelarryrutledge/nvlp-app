import { SupabaseClient } from '@supabase/supabase-js';
import { Database, ExportResponse, TransactionExportData, ApiError, ErrorCode } from '@nvlp/types';
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

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}