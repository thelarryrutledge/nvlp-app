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
      console.log(`[DashboardService] Calling dashboard endpoint for budget: ${budgetId}`);
      const response = await edgeTransport.request(
        'GET',
        `dashboard?budget_id=${budgetId}&days=${days}`
      );
      
      if (response.error || !response.data) {
        const errorMessage = response.error ? 
          (typeof response.error === 'object' && 'message' in response.error ? response.error.message : 'API Error') :
          'Failed to fetch dashboard data';
        throw new Error(errorMessage);
      }
      
      // Edge Function returns {success: true, data: DashboardData}
      const edgeResponse = response.data as { success: boolean; data: DashboardData };
      if (!edgeResponse.success || !edgeResponse.data) {
        throw new Error('Dashboard data not available');
      }
      
      return edgeResponse.data;
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
        `dashboard/budget-overview?budget_id=${budgetId}`
      );
      
      if (response.error || !response.data) {
        const errorMessage = response.error ? 
          (typeof response.error === 'object' && 'message' in response.error ? response.error.message : 'API Error') :
          'Failed to fetch budget overview';
        throw new Error(errorMessage);
      }
      
      // Handle potential Edge Function response format
      const edgeResponse = response.data as any;
      return edgeResponse.success ? edgeResponse.data : edgeResponse;
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
        `dashboard/envelopes-summary?budget_id=${budgetId}`
      );
      
      if (response.error || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch envelopes summary');
      }
      
      // Handle potential Edge Function response format
      const edgeResponse = response.data as any;
      return edgeResponse.success ? edgeResponse.data : edgeResponse;
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