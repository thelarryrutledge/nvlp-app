import { BaseService } from './base.service';
import { 
  Transaction, 
  TransactionCreateRequest, 
  TransactionUpdateRequest, 
  TransactionType,
  TransactionWithDetails,
  ApiError, 
  ErrorCode 
} from '@nvlp/types';

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: TransactionType;
  envelopeId?: string;
  payeeId?: string;
  incomeSourceId?: string;
  categoryId?: string;
  isCleared?: boolean;
  isReconciled?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

export class TransactionService extends BaseService {
  async listTransactions(
    budgetId: string, 
    filters?: TransactionFilters,
    limit?: number,
    offset?: number
  ): Promise<Transaction[]> {
    await this.verifyBudgetAccess(budgetId);

    let query = this.client
      .from('transactions')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('is_deleted', false);

    // Apply filters
    if (filters) {
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters.transactionType) {
        query = query.eq('transaction_type', filters.transactionType);
      }
      if (filters.envelopeId) {
        query = query.or(`from_envelope_id.eq.${filters.envelopeId},to_envelope_id.eq.${filters.envelopeId}`);
      }
      if (filters.payeeId) {
        query = query.eq('payee_id', filters.payeeId);
      }
      if (filters.incomeSourceId) {
        query = query.eq('income_source_id', filters.incomeSourceId);
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters.isCleared !== undefined) {
        query = query.eq('is_cleared', filters.isCleared);
      }
      if (filters.isReconciled !== undefined) {
        query = query.eq('is_reconciled', filters.isReconciled);
      }
      if (filters.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }
    }

    query = query.order('transaction_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      this.handleError(error);
    }

    return data as Transaction[];
  }

  async getTransaction(id: string): Promise<TransactionWithDetails> {
    const { data, error } = await this.client
      .from('transactions')
      .select(`
        *,
        from_envelope:envelopes!from_envelope_id(*),
        to_envelope:envelopes!to_envelope_id(*),
        payee:payees!payee_id(*),
        income_source:income_sources!income_source_id(*),
        category:categories!category_id(*)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Transaction not found');
      }
      this.handleError(error);
    }

    await this.verifyBudgetAccess(data.budget_id);
    return data as TransactionWithDetails;
  }

  async createTransaction(budgetId: string, request: TransactionCreateRequest): Promise<Transaction> {
    await this.verifyBudgetAccess(budgetId);
    this.validateTransactionRequest(request);

    const { data, error } = await this.client
      .from('transactions')
      .insert({
        budget_id: budgetId,
        ...request,
        is_cleared: request.is_cleared ?? false,
      })
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Transaction;
  }

  async updateTransaction(id: string, updates: TransactionUpdateRequest): Promise<Transaction> {
    const transaction = await this.getTransaction(id);

    // Validate updates don't change transaction type requirements
    if (updates.from_envelope_id !== undefined || 
        updates.to_envelope_id !== undefined ||
        updates.payee_id !== undefined ||
        updates.income_source_id !== undefined) {
      this.validateTransactionRequest({
        transaction_type: transaction.transaction_type,
        amount: updates.amount || transaction.amount,
        transaction_date: updates.transaction_date || transaction.transaction_date,
        from_envelope_id: updates.from_envelope_id ?? transaction.from_envelope_id,
        to_envelope_id: updates.to_envelope_id ?? transaction.to_envelope_id,
        payee_id: updates.payee_id ?? transaction.payee_id,
        income_source_id: updates.income_source_id ?? transaction.income_source_id,
      });
    }

    const { data, error } = await this.client
      .from('transactions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Transaction;
  }

  async softDeleteTransaction(id: string): Promise<void> {
    const transaction = await this.getTransaction(id);
    const userId = await this.getCurrentUserId();

    const { error } = await this.client
      .from('transactions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      this.handleError(error);
    }
  }

  async restoreTransaction(id: string): Promise<Transaction> {
    const userId = await this.getCurrentUserId();

    // Check if user can restore (must be the one who deleted)
    const { data: transaction, error: fetchError } = await this.client
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', true)
      .eq('deleted_by', userId)
      .single();

    if (fetchError || !transaction) {
      throw new ApiError(
        ErrorCode.NOT_FOUND,
        'Deleted transaction not found or you cannot restore it'
      );
    }

    await this.verifyBudgetAccess(transaction.budget_id);

    const { data, error } = await this.client
      .from('transactions')
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Transaction;
  }

  async getRecentTransactions(budgetId: string, limit: number = 10): Promise<Transaction[]> {
    return this.listTransactions(budgetId, undefined, limit);
  }

  async getTransactionsByEnvelope(envelopeId: string, limit?: number): Promise<Transaction[]> {
    // First get the envelope to verify access and get budget_id
    const { data: envelope, error: envelopeError } = await this.client
      .from('envelopes')
      .select('budget_id')
      .eq('id', envelopeId)
      .single();

    if (envelopeError || !envelope) {
      throw new ApiError(ErrorCode.NOT_FOUND, 'Envelope not found');
    }

    return this.listTransactions(envelope.budget_id, { envelopeId }, limit);
  }

  private validateTransactionRequest(request: TransactionCreateRequest): void {
    const { transaction_type, from_envelope_id, to_envelope_id, payee_id, income_source_id } = request;

    switch (transaction_type) {
      case TransactionType.INCOME:
        if (!income_source_id || from_envelope_id || to_envelope_id || payee_id) {
          throw new ApiError(
            ErrorCode.VALIDATION_ERROR,
            'Income transactions require income_source_id and no envelope or payee references'
          );
        }
        break;

      case TransactionType.ALLOCATION:
        if (!to_envelope_id || from_envelope_id || payee_id || income_source_id) {
          throw new ApiError(
            ErrorCode.VALIDATION_ERROR,
            'Allocation transactions require to_envelope_id only'
          );
        }
        break;

      case TransactionType.EXPENSE:
      case TransactionType.DEBT_PAYMENT:
        if (!from_envelope_id || !payee_id || to_envelope_id || income_source_id) {
          throw new ApiError(
            ErrorCode.VALIDATION_ERROR,
            `${transaction_type} transactions require from_envelope_id and payee_id`
          );
        }
        break;

      case TransactionType.TRANSFER:
        if (!from_envelope_id || !to_envelope_id || payee_id || income_source_id) {
          throw new ApiError(
            ErrorCode.VALIDATION_ERROR,
            'Transfer transactions require from_envelope_id and to_envelope_id'
          );
        }
        if (from_envelope_id === to_envelope_id) {
          throw new ApiError(
            ErrorCode.INVALID_ENVELOPE_TRANSFER,
            'Cannot transfer to the same envelope'
          );
        }
        break;

      default:
        throw new ApiError(
          ErrorCode.INVALID_TRANSACTION_TYPE,
          'Invalid transaction type'
        );
    }

    if (request.amount <= 0) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Transaction amount must be positive'
      );
    }
  }

  private async verifyBudgetAccess(budgetId: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await this.client
      .from('budgets')
      .select('id')
      .eq('id', budgetId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Budget not found or access denied');
      }
      this.handleError(error);
    }
  }
}