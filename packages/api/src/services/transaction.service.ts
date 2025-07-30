import { BaseService } from './base.service';
import { 
  Transaction, 
  TransactionCreateRequest, 
  TransactionUpdateRequest, 
  TransactionType,
  TransactionWithDetails,
  ApiError, 
  ErrorCode,
  EnvelopeType 
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
        from_envelope:from_envelope_id(id, name),
        to_envelope:to_envelope_id(id, name),
        payee:payee_id(id, name),
        income_source:income_source_id(id, name),
        category:category_id(id, name)
      `)
      .eq('id', id)
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
    await this.validateTransactionRequest(request, budgetId);

    const { data, error } = await this.client
      .from('transactions')
      .insert({
        budget_id: budgetId,
        ...request,
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

    // If changing core transaction fields, validate
    if (updates.from_envelope_id !== undefined || 
        updates.to_envelope_id !== undefined ||
        updates.payee_id !== undefined ||
        updates.income_source_id !== undefined) {
      await this.validateTransactionRequest({
        transaction_type: transaction.transaction_type,
        amount: updates.amount || transaction.amount,
        transaction_date: updates.transaction_date || transaction.transaction_date,
        from_envelope_id: updates.from_envelope_id ?? transaction.from_envelope_id,
        to_envelope_id: updates.to_envelope_id ?? transaction.to_envelope_id,
        payee_id: updates.payee_id ?? transaction.payee_id,
        income_source_id: updates.income_source_id ?? transaction.income_source_id,
      }, transaction.budget_id);
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
    await this.getTransaction(id); // Verify access
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

  async getTransactionsByPayee(payeeId: string, limit?: number): Promise<Transaction[]> {
    // First get the payee to verify access and get budget_id
    const { data: payee, error: payeeError } = await this.client
      .from('payees')
      .select('budget_id')
      .eq('id', payeeId)
      .single();

    if (payeeError || !payee) {
      throw new ApiError(ErrorCode.NOT_FOUND, 'Payee not found');
    }

    return this.listTransactions(payee.budget_id, { payeeId }, limit);
  }

  private async validateTransactionRequest(request: TransactionCreateRequest, budgetId?: string): Promise<void> {
    const { transaction_type, from_envelope_id, to_envelope_id, payee_id, income_source_id } = request;

    // Basic amount validation
    if (request.amount <= 0) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Transaction amount must be positive'
      );
    }

    // Validate amount has at most 2 decimal places (cents)
    if (Math.round(request.amount * 100) !== request.amount * 100) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Transaction amount can have at most 2 decimal places'
      );
    }

    // Validate transaction date is not in the future
    const transactionDate = new Date(request.transaction_date);
    if (transactionDate > new Date()) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Transaction date cannot be in the future'
      );
    }

    // Validate description length if provided
    if (request.description && request.description.length > 500) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Transaction description must be 500 characters or less'
      );
    }


    // Type-specific validation
    switch (transaction_type) {
      case TransactionType.INCOME:
        if (!income_source_id || from_envelope_id || to_envelope_id || payee_id) {
          throw new ApiError(
            ErrorCode.VALIDATION_ERROR,
            'Income transactions require income_source_id and no envelope or payee references'
          );
        }
        // Verify income source exists and belongs to the budget
        if (budgetId) {
          const { data: incomeSource } = await this.client
            .from('income_sources')
            .select('id')
            .eq('id', income_source_id)
            .eq('budget_id', budgetId)
            .single();
          
          if (!incomeSource) {
            throw new ApiError(ErrorCode.NOT_FOUND, 'Income source not found or does not belong to this budget');
          }
        }
        break;

      case TransactionType.ALLOCATION:
        if (!to_envelope_id || from_envelope_id || payee_id || income_source_id) {
          throw new ApiError(
            ErrorCode.VALIDATION_ERROR,
            'Allocation transactions require to_envelope_id only'
          );
        }
        // Verify envelope exists and belongs to the budget
        if (budgetId) {
          const { data: envelope } = await this.client
            .from('envelopes')
            .select('id, is_active')
            .eq('id', to_envelope_id)
            .eq('budget_id', budgetId)
            .single();
          
          if (!envelope) {
            throw new ApiError(ErrorCode.NOT_FOUND, 'Envelope not found or does not belong to this budget');
          }
          if (!envelope.is_active) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Cannot allocate to inactive envelope');
          }
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
        // Verify entities exist and belong to the budget
        if (budgetId) {
          const { data: envelope } = await this.client
            .from('envelopes')
            .select('id, is_active, envelope_type')
            .eq('id', from_envelope_id)
            .eq('budget_id', budgetId)
            .single();
          
          if (!envelope) {
            throw new ApiError(ErrorCode.NOT_FOUND, 'Envelope not found or does not belong to this budget');
          }
          if (!envelope.is_active) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Cannot spend from inactive envelope');
          }

          const { data: payee } = await this.client
            .from('payees')
            .select('id, is_active')
            .eq('id', payee_id)
            .eq('budget_id', budgetId)
            .single();
          
          if (!payee) {
            throw new ApiError(ErrorCode.NOT_FOUND, 'Payee not found or does not belong to this budget');
          }
          if (!payee.is_active) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Cannot make payment to inactive payee');
          }

          // Additional validation for debt payments
          if (transaction_type === TransactionType.DEBT_PAYMENT) {
            if (envelope.envelope_type !== EnvelopeType.DEBT) {
              throw new ApiError(
                ErrorCode.VALIDATION_ERROR,
                'Debt payments must be made from debt envelopes'
              );
            }
          }
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
        // Verify both envelopes exist and belong to the budget
        if (budgetId) {
          const { data: fromEnvelope } = await this.client
            .from('envelopes')
            .select('id, is_active')
            .eq('id', from_envelope_id)
            .eq('budget_id', budgetId)
            .single();
          
          if (!fromEnvelope) {
            throw new ApiError(ErrorCode.NOT_FOUND, 'Source envelope not found or does not belong to this budget');
          }
          if (!fromEnvelope.is_active) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Cannot transfer from inactive envelope');
          }

          const { data: toEnvelope } = await this.client
            .from('envelopes')
            .select('id, is_active')
            .eq('id', to_envelope_id)
            .eq('budget_id', budgetId)
            .single();
          
          if (!toEnvelope) {
            throw new ApiError(ErrorCode.NOT_FOUND, 'Destination envelope not found or does not belong to this budget');
          }
          if (!toEnvelope.is_active) {
            throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Cannot transfer to inactive envelope');
          }
        }
        break;

      default:
        throw new ApiError(
          ErrorCode.INVALID_TRANSACTION_TYPE,
          'Invalid transaction type'
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