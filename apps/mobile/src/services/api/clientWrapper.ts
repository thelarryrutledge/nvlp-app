/**
 * API Client Wrapper
 * 
 * Wraps the NVLP client to add interceptor support and enhanced functionality
 */

import { apiClient } from './client';
import { interceptorManager, initializeInterceptors, type RequestConfig } from './interceptors';
import { transformError, logError } from './errors';

class ApiClientWrapper {
  private initialized = false;

  constructor() {
    this.initializeInterceptors();
  }

  private initializeInterceptors() {
    if (!this.initialized) {
      initializeInterceptors();
      this.initialized = true;
    }
  }

  /**
   * Wrap any API operation with interceptor support
   */
  async executeWithInterceptors<T>(
    operation: () => Promise<T>,
    context?: {
      method?: string;
      url?: string;
      data?: any;
      retries?: number;
    }
  ): Promise<T> {
    const config: RequestConfig = {
      url: context?.url || 'unknown',
      method: context?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      data: context?.data,
      retries: context?.retries || 3,
      metadata: {
        startTime: Date.now(),
        attempt: 1,
        context: context?.url,
      },
    };

    try {
      // Process request through interceptors
      const processedConfig = await interceptorManager.processRequest(config);
      
      // Execute the operation
      const result = await operation();
      
      // Process response through interceptors
      const processedResponse = await interceptorManager.processResponse(
        { data: result, config: processedConfig },
        processedConfig
      );
      
      return processedResponse.data;
    } catch (error) {
      // Process error through interceptors
      const processedError = await interceptorManager.processError(error, config);
      throw processedError;
    }
  }

  /**
   * Enhanced authentication methods with interceptor support
   */
  async login(email: string, password: string) {
    return this.executeWithInterceptors(
      () => apiClient.login(email, password),
      { method: 'POST', url: '/auth/login', data: { email } }
    );
  }

  async register(email: string, password: string, displayName?: string) {
    return this.executeWithInterceptors(
      () => apiClient.register(email, password, displayName),
      { method: 'POST', url: '/auth/register', data: { email, displayName } }
    );
  }

  async logout() {
    return this.executeWithInterceptors(
      () => apiClient.logout(),
      { method: 'POST', url: '/auth/logout' }
    );
  }

  async refreshToken() {
    return this.executeWithInterceptors(
      () => apiClient.refreshToken(),
      { method: 'POST', url: '/auth/refresh' }
    );
  }

  async resetPassword(email: string) {
    return this.executeWithInterceptors(
      () => apiClient.resetPassword(email),
      { method: 'POST', url: '/auth/reset', data: { email } }
    );
  }

  /**
   * Enhanced budget methods with interceptor support
   */
  async getBudgets(params?: any) {
    return this.executeWithInterceptors(
      () => apiClient.getBudgets(params),
      { method: 'GET', url: '/budgets' }
    );
  }

  async getBudget(id: string) {
    return this.executeWithInterceptors(
      () => apiClient.getBudget(id),
      { method: 'GET', url: `/budgets/${id}` }
    );
  }

  async createBudget(input: any) {
    return this.executeWithInterceptors(
      () => apiClient.createBudget(input),
      { method: 'POST', url: '/budgets', data: input }
    );
  }

  async updateBudget(id: string, updates: any) {
    return this.executeWithInterceptors(
      () => apiClient.updateBudget(id, updates),
      { method: 'PATCH', url: `/budgets/${id}`, data: updates }
    );
  }

  async deleteBudget(id: string) {
    return this.executeWithInterceptors(
      () => apiClient.deleteBudget(id),
      { method: 'DELETE', url: `/budgets/${id}` }
    );
  }

  /**
   * Enhanced envelope methods with interceptor support
   */
  async getEnvelopes(budgetId?: string, params?: any) {
    return this.executeWithInterceptors(
      () => apiClient.getEnvelopes(budgetId, params),
      { method: 'GET', url: `/envelopes${budgetId ? `?budget_id=${budgetId}` : ''}` }
    );
  }

  async getEnvelope(id: string) {
    return this.executeWithInterceptors(
      () => apiClient.getEnvelope(id),
      { method: 'GET', url: `/envelopes/${id}` }
    );
  }

  async createEnvelope(input: any) {
    return this.executeWithInterceptors(
      () => apiClient.createEnvelope(input),
      { method: 'POST', url: '/envelopes', data: input }
    );
  }

  async updateEnvelope(id: string, updates: any) {
    return this.executeWithInterceptors(
      () => apiClient.updateEnvelope(id, updates),
      { method: 'PATCH', url: `/envelopes/${id}`, data: updates }
    );
  }

  async deleteEnvelope(id: string) {
    return this.executeWithInterceptors(
      () => apiClient.deleteEnvelope(id),
      { method: 'DELETE', url: `/envelopes/${id}` }
    );
  }

  /**
   * Enhanced user profile methods with interceptor support
   */
  async getProfile() {
    return this.executeWithInterceptors(
      () => apiClient.getProfile(),
      { method: 'GET', url: '/profile' }
    );
  }

  async updateProfile(updates: any) {
    return this.executeWithInterceptors(
      () => apiClient.updateProfile(updates),
      { method: 'PATCH', url: '/profile', data: updates }
    );
  }

  /**
   * Health check with interceptor support
   */
  async healthCheck() {
    return this.executeWithInterceptors(
      () => apiClient.healthCheck(),
      { method: 'GET', url: '/health' }
    );
  }

  /**
   * Direct access to underlying client for advanced operations
   */
  getUnderlyingClient() {
    return apiClient;
  }

  /**
   * Authentication state methods (direct access, no interceptors needed)
   */
  getAuthState() {
    return apiClient.getAuthState();
  }

  isAuthenticated() {
    return apiClient.isAuthenticated();
  }

  needsTokenRefresh() {
    return apiClient.needsTokenRefresh();
  }

  clearAuth() {
    return apiClient.clearAuth();
  }

  /**
   * Add custom interceptor
   */
  addRequestInterceptor(interceptor: any) {
    return interceptorManager.addRequestInterceptor(interceptor);
  }

  addResponseInterceptor(interceptor: any) {
    return interceptorManager.addResponseInterceptor(interceptor);
  }
}

// Create singleton instance
export const enhancedApiClient = new ApiClientWrapper();