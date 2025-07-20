/**
 * Dashboard Service
 * 
 * Service layer for dashboard data operations with error handling
 */

import { apiClient } from './client';
import { transformError, logError } from './errors';
import type { DashboardData, BudgetOverview, EnvelopeSummary } from '@nvlp/types';

class DashboardService {
  /**
   * Get complete dashboard data for a budget
   */
  async getDashboardData(budgetId: string, days: number = 30): Promise<DashboardData> {
    try {
      // Use the edge function transport directly to call the dashboard endpoint
      const edgeTransport = apiClient.getEdgeFunctionTransport();
      const response = await edgeTransport.request(
        'GET',
        `/dashboard?budget_id=${budgetId}&days=${days}`
      );
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      return response.data as DashboardData;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'DashboardService.getDashboardData');
      throw apiError;
    }
  }

  /**
   * Get budget overview only
   */
  async getBudgetOverview(budgetId: string): Promise<BudgetOverview> {
    try {
      const edgeTransport = apiClient.getEdgeFunctionTransport();
      const response = await edgeTransport.request(
        'GET',
        `/dashboard/budget-overview?budget_id=${budgetId}`
      );
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch budget overview');
      }
      
      return response.data as BudgetOverview;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'DashboardService.getBudgetOverview');
      throw apiError;
    }
  }

  /**
   * Get envelopes summary only
   */
  async getEnvelopesSummary(budgetId: string): Promise<EnvelopeSummary[]> {
    try {
      const edgeTransport = apiClient.getEdgeFunctionTransport();
      const response = await edgeTransport.request(
        'GET',
        `/dashboard/envelopes-summary?budget_id=${budgetId}`
      );
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch envelopes summary');
      }
      
      return response.data as EnvelopeSummary[];
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'DashboardService.getEnvelopesSummary');
      throw apiError;
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;