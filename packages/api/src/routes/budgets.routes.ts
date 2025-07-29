import { BudgetService } from '../services';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Budget, BudgetCreateRequest, BudgetUpdateRequest } from '@nvlp/types';

export interface BudgetRouteHandlers {
  listBudgets: () => Promise<Budget[]>;
  getBudget: (id: string) => Promise<Budget>;
  createBudget: (request: BudgetCreateRequest) => Promise<Budget>;
  updateBudget: (id: string, updates: BudgetUpdateRequest) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  setDefaultBudget: (budgetId: string) => Promise<void>;
  getDefaultBudget: () => Promise<Budget | null>;
}

export function createBudgetRoutes(client: SupabaseClient<Database>): BudgetRouteHandlers {
  const budgetService = new BudgetService(client);

  return {
    listBudgets: async () => {
      return await budgetService.listBudgets();
    },

    getBudget: async (id: string) => {
      return await budgetService.getBudget(id);
    },

    createBudget: async (request: BudgetCreateRequest) => {
      return await budgetService.createBudget(request);
    },

    updateBudget: async (id: string, updates: BudgetUpdateRequest) => {
      return await budgetService.updateBudget(id, updates);
    },

    deleteBudget: async (id: string) => {
      await budgetService.deleteBudget(id);
    },

    setDefaultBudget: async (budgetId: string) => {
      await budgetService.setDefaultBudget(budgetId);
    },

    getDefaultBudget: async () => {
      return await budgetService.getDefaultBudget();
    }
  };
}