/**
 * Budget Service
 * 
 * Service layer for budget operations with error handling
 */

import { enhancedApiClient } from './clientWrapper';
import { transformError, logError } from './errors';
import type { Budget, CreateBudgetInput, UpdateBudgetInput, QueryParams } from '@nvlp/types';

class BudgetService {
  /**
   * Get all budgets for the current user
   */
  async getBudgets(params?: QueryParams): Promise<Budget[]> {
    try {
      const budgets = await enhancedApiClient.getBudgets(params);
      return budgets;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'BudgetService.getBudgets');
      throw apiError;
    }
  }

  /**
   * Get a specific budget by ID
   */
  async getBudget(id: string): Promise<Budget> {
    try {
      const budget = await enhancedApiClient.getBudget(id);
      return budget;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'BudgetService.getBudget');
      throw apiError;
    }
  }

  /**
   * Create a new budget
   */
  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    try {
      const budget = await enhancedApiClient.createBudget(input);
      return budget;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'BudgetService.createBudget');
      throw apiError;
    }
  }

  /**
   * Update an existing budget
   */
  async updateBudget(id: string, updates: UpdateBudgetInput): Promise<Budget> {
    try {
      const budget = await enhancedApiClient.updateBudget(id, updates);
      return budget;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'BudgetService.updateBudget');
      throw apiError;
    }
  }

  /**
   * Delete a budget
   */
  async deleteBudget(id: string): Promise<void> {
    try {
      await enhancedApiClient.deleteBudget(id);
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'BudgetService.deleteBudget');
      throw apiError;
    }
  }
}

export const budgetService = new BudgetService();