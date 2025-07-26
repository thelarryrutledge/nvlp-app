/**
 * Transaction Service
 * 
 * Service layer for transaction operations with error handling
 */

import { enhancedApiClient } from './clientWrapper';
import { transformError, logError } from './errors';
import { tokenManager } from '../auth/tokenManager';
import type { Transaction } from '@nvlp/types';

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

interface EnvelopeTransactionsResponse {
  transactions: Transaction[];
  total_count: number;
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

      const response = await fetch('https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
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

      const response = await fetch('https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
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

  /**
   * Get transactions for a specific envelope
   */
  async getEnvelopeTransactions(
    envelopeId: string,
    limit?: number,
    offset?: number
  ): Promise<EnvelopeTransactionsResponse> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      const queryString = params.toString();
      const url = `https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/transactions?or=(from_envelope_id.eq.${envelopeId},to_envelope_id.eq.${envelopeId})&order=transaction_date.desc${queryString ? `&${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch envelope transactions: ${response.statusText}`);
      }

      const transactions = await response.json();
      
      return {
        transactions,
        total_count: transactions.length,
      };
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'TransactionService.getEnvelopeTransactions');
      throw apiError;
    }
  }
}

export const transactionService = new TransactionService();