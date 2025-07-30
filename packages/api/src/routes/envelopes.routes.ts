import { EnvelopeService, TransactionService } from '../services';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Envelope, EnvelopeCreateRequest, EnvelopeUpdateRequest, Transaction } from '@nvlp/types';

export interface EnvelopeRouteHandlers {
  listEnvelopes: (budgetId: string) => Promise<Envelope[]>;
  getEnvelope: (id: string) => Promise<Envelope>;
  createEnvelope: (budgetId: string, request: EnvelopeCreateRequest) => Promise<Envelope>;
  updateEnvelope: (id: string, updates: EnvelopeUpdateRequest) => Promise<Envelope>;
  deleteEnvelope: (id: string) => Promise<void>;
  getNegativeBalanceEnvelopes: (budgetId: string) => Promise<Envelope[]>;
  getLowBalanceEnvelopes: (budgetId: string) => Promise<Envelope[]>;
  getEnvelopeTransactions: (id: string, limit?: number) => Promise<Transaction[]>;
}

export function createEnvelopeRoutes(client: SupabaseClient<Database>): EnvelopeRouteHandlers {
  const envelopeService = new EnvelopeService(client);
  const transactionService = new TransactionService(client);

  return {
    listEnvelopes: async (budgetId: string) => {
      return await envelopeService.listEnvelopes(budgetId);
    },

    getEnvelope: async (id: string) => {
      return await envelopeService.getEnvelope(id);
    },

    createEnvelope: async (budgetId: string, request: EnvelopeCreateRequest) => {
      return await envelopeService.createEnvelope(budgetId, request);
    },

    updateEnvelope: async (id: string, updates: EnvelopeUpdateRequest) => {
      return await envelopeService.updateEnvelope(id, updates);
    },

    deleteEnvelope: async (id: string) => {
      await envelopeService.deleteEnvelope(id);
    },

    getNegativeBalanceEnvelopes: async (budgetId: string) => {
      return await envelopeService.getNegativeBalanceEnvelopes(budgetId);
    },

    getLowBalanceEnvelopes: async (budgetId: string) => {
      return await envelopeService.getLowBalanceEnvelopes(budgetId);
    },

    getEnvelopeTransactions: async (id: string, limit?: number) => {
      return await transactionService.getTransactionsByEnvelope(id, limit);
    }
  };
}