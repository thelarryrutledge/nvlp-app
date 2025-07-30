import { PayeeService, TransactionService } from '../services';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Payee, PayeeCreateRequest, PayeeUpdateRequest, Transaction } from '@nvlp/types';

export interface PayeeRouteHandlers {
  listPayees: (budgetId: string) => Promise<Payee[]>;
  getPayee: (id: string) => Promise<Payee>;
  createPayee: (budgetId: string, request: PayeeCreateRequest) => Promise<Payee>;
  updatePayee: (id: string, updates: PayeeUpdateRequest) => Promise<Payee>;
  deletePayee: (id: string) => Promise<void>;
  searchPayees: (budgetId: string, query: string) => Promise<Payee[]>;
  getRecentPayees: (budgetId: string, limit?: number) => Promise<Payee[]>;
  getTopPayees: (budgetId: string, limit?: number) => Promise<Payee[]>;
  getPayeeTransactions: (id: string, limit?: number) => Promise<Transaction[]>;
}

export function createPayeeRoutes(client: SupabaseClient<Database>): PayeeRouteHandlers {
  const payeeService = new PayeeService(client);
  const transactionService = new TransactionService(client);

  return {
    listPayees: async (budgetId: string) => {
      return await payeeService.listPayees(budgetId);
    },

    getPayee: async (id: string) => {
      return await payeeService.getPayee(id);
    },

    createPayee: async (budgetId: string, request: PayeeCreateRequest) => {
      return await payeeService.createPayee(budgetId, request);
    },

    updatePayee: async (id: string, updates: PayeeUpdateRequest) => {
      return await payeeService.updatePayee(id, updates);
    },

    deletePayee: async (id: string) => {
      await payeeService.deletePayee(id);
    },

    searchPayees: async (budgetId: string, query: string) => {
      return await payeeService.searchPayees(budgetId, query);
    },

    getRecentPayees: async (budgetId: string, limit?: number) => {
      return await payeeService.getRecentPayees(budgetId, limit);
    },

    getTopPayees: async (budgetId: string, limit?: number) => {
      return await payeeService.getTopPayees(budgetId, limit);
    },

    getPayeeTransactions: async (id: string, limit?: number) => {
      return await transactionService.getTransactionsByPayee(id, limit);
    }
  };
}