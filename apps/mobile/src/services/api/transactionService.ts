/**
 * Transaction Service
 * 
 * Service layer for transaction operations with error handling
 */

import { enhancedApiClient } from './clientWrapper';
import { transformError, logError } from './errors';

interface AllocationTransactionRequest {
  budget_id: string;
  amount: number;
  description: string;
  to_envelope_id: string;
  transaction_date?: string;
}

interface TransferTransactionRequest {
  budget_id: string;
  amount: number;
  description: string;
  from_envelope_id: string;
  to_envelope_id: string;
  transaction_date?: string;
}

class TransactionService {
  /**
   * Create an allocation transaction (fund envelope from available budget)
   */
  async createAllocationTransaction(request: AllocationTransactionRequest): Promise<void> {
    try {
      const transactionData = {
        budget_id: request.budget_id,
        transaction_type: 'allocation' as const,
        amount: request.amount,
        description: request.description,
        transaction_date: request.transaction_date || new Date().toISOString(),
        to_envelope_id: request.to_envelope_id,
        from_envelope_id: null,
        payee_id: null,
        is_cleared: true,
      };

      const response = await fetch(`${enhancedApiClient.baseURL}/functions/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await enhancedApiClient.getToken()}`,
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create allocation transaction');
      }

      await response.json(); // Parse response to ensure it's valid
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'TransactionService.createAllocationTransaction');
      throw apiError;
    }
  }

  /**
   * Create a transfer transaction (move money between envelopes)
   */
  async createTransferTransaction(request: TransferTransactionRequest): Promise<void> {
    try {
      const transactionData = {
        budget_id: request.budget_id,
        transaction_type: 'transfer' as const,
        amount: request.amount,
        description: request.description,
        transaction_date: request.transaction_date || new Date().toISOString(),
        from_envelope_id: request.from_envelope_id,
        to_envelope_id: request.to_envelope_id,
        payee_id: null,
        is_cleared: true,
      };

      const response = await fetch(`${enhancedApiClient.baseURL}/functions/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await enhancedApiClient.getToken()}`,
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create transfer transaction');
      }

      await response.json(); // Parse response to ensure it's valid
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'TransactionService.createTransferTransaction');
      throw apiError;
    }
  }
}

export const transactionService = new TransactionService();