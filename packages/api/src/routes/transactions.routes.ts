import { TransactionService } from '../services';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Database, 
  Transaction, 
  TransactionCreateRequest, 
  TransactionUpdateRequest,
  TransactionWithDetails 
} from '@nvlp/types';
import { TransactionFilters } from '../services/transaction.service';

export interface TransactionRouteHandlers {
  listTransactions: (budgetId: string, filters?: TransactionFilters, limit?: number, offset?: number) => Promise<Transaction[]>;
  getTransaction: (id: string) => Promise<TransactionWithDetails>;
  createTransaction: (budgetId: string, request: TransactionCreateRequest) => Promise<Transaction>;
  updateTransaction: (id: string, updates: TransactionUpdateRequest) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  restoreTransaction: (id: string) => Promise<Transaction>;
  getRecentTransactions: (budgetId: string, limit?: number) => Promise<Transaction[]>;
  getPendingTransactions: (budgetId: string, limit?: number) => Promise<Transaction[]>;
}

export function createTransactionRoutes(client: SupabaseClient<Database>): TransactionRouteHandlers {
  const transactionService = new TransactionService(client);

  return {
    listTransactions: async (budgetId: string, filters?: TransactionFilters, limit?: number, offset?: number) => {
      return await transactionService.listTransactions(budgetId, filters, limit, offset);
    },

    getTransaction: async (id: string) => {
      return await transactionService.getTransaction(id);
    },

    createTransaction: async (budgetId: string, request: TransactionCreateRequest) => {
      return await transactionService.createTransaction(budgetId, request);
    },

    updateTransaction: async (id: string, updates: TransactionUpdateRequest) => {
      return await transactionService.updateTransaction(id, updates);
    },

    deleteTransaction: async (id: string) => {
      await transactionService.softDeleteTransaction(id);
    },

    restoreTransaction: async (id: string) => {
      return await transactionService.restoreTransaction(id);
    },

    getRecentTransactions: async (budgetId: string, limit?: number) => {
      return await transactionService.getRecentTransactions(budgetId, limit);
    },

    getPendingTransactions: async (budgetId: string, limit?: number) => {
      return await transactionService.getPendingTransactions(budgetId, limit);
    }
  };
}