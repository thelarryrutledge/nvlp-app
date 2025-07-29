import { IncomeService } from '../services';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, IncomeSource, IncomeSourceCreateRequest, IncomeSourceUpdateRequest } from '@nvlp/types';

export interface IncomeSourceRouteHandlers {
  listIncomeSources: (budgetId: string) => Promise<IncomeSource[]>;
  getIncomeSource: (id: string) => Promise<IncomeSource>;
  createIncomeSource: (budgetId: string, request: IncomeSourceCreateRequest) => Promise<IncomeSource>;
  updateIncomeSource: (id: string, updates: IncomeSourceUpdateRequest) => Promise<IncomeSource>;
  deleteIncomeSource: (id: string) => Promise<void>;
  getOverdueIncomeSources: (budgetId: string) => Promise<IncomeSource[]>;
  getUpcomingIncomeSources: (budgetId: string, days?: number) => Promise<IncomeSource[]>;
}

export function createIncomeSourceRoutes(client: SupabaseClient<Database>): IncomeSourceRouteHandlers {
  const incomeService = new IncomeService(client);

  return {
    listIncomeSources: async (budgetId: string) => {
      return await incomeService.listIncomeSources(budgetId);
    },

    getIncomeSource: async (id: string) => {
      return await incomeService.getIncomeSource(id);
    },

    createIncomeSource: async (budgetId: string, request: IncomeSourceCreateRequest) => {
      return await incomeService.createIncomeSource(budgetId, request);
    },

    updateIncomeSource: async (id: string, updates: IncomeSourceUpdateRequest) => {
      return await incomeService.updateIncomeSource(id, updates);
    },

    deleteIncomeSource: async (id: string) => {
      await incomeService.deleteIncomeSource(id);
    },

    getOverdueIncomeSources: async (budgetId: string) => {
      return await incomeService.getOverdueIncomeSources(budgetId);
    },

    getUpcomingIncomeSources: async (budgetId: string, days?: number) => {
      return await incomeService.getUpcomingIncomeSources(budgetId, days);
    }
  };
}