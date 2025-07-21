/**
 * Income Source Service
 * 
 * Service layer for income source operations using enhanced API client
 */

import { enhancedApiClient } from './clientWrapper';
import { transformError, logError } from './errors';
import type { IncomeSource, CreateIncomeSourceInput, UpdateIncomeSourceInput } from '@nvlp/types';

class IncomeSourceService {
  /**
   * Get all income sources for a budget
   */
  async getIncomeSources(budgetId: string): Promise<IncomeSource[]> {
    try {
      const incomeSources = await enhancedApiClient.getIncomeSources(budgetId, {
        order: 'name.asc',
      });
      return incomeSources;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'IncomeSourceService.getIncomeSources');
      throw apiError;
    }
  }

  /**
   * Get a single income source by ID
   */
  async getIncomeSource(incomeSourceId: string): Promise<IncomeSource> {
    try {
      const incomeSource = await enhancedApiClient.getIncomeSource(incomeSourceId);
      return incomeSource;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'IncomeSourceService.getIncomeSource');
      throw apiError;
    }
  }

  /**
   * Create a new income source
   */
  async createIncomeSource(budgetId: string, data: Omit<CreateIncomeSourceInput, 'budget_id'>): Promise<IncomeSource> {
    try {
      const incomeSource = await enhancedApiClient.createIncomeSource({
        ...data,
        budget_id: budgetId,
      });
      return incomeSource;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'IncomeSourceService.createIncomeSource');
      throw apiError;
    }
  }

  /**
   * Update an income source
   */
  async updateIncomeSource(incomeSourceId: string, data: UpdateIncomeSourceInput): Promise<IncomeSource> {
    try {
      const incomeSource = await enhancedApiClient.updateIncomeSource(incomeSourceId, data);
      return incomeSource;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'IncomeSourceService.updateIncomeSource');
      throw apiError;
    }
  }

  /**
   * Delete an income source (soft delete by marking inactive)
   */
  async deleteIncomeSource(incomeSourceId: string): Promise<void> {
    try {
      await enhancedApiClient.deleteIncomeSource(incomeSourceId);
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'IncomeSourceService.deleteIncomeSource');
      throw apiError;
    }
  }
}

// Export singleton instance
export const incomeSourceService = new IncomeSourceService();
export default incomeSourceService;