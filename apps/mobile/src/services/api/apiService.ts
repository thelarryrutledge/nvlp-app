/**
 * API Service
 * 
 * Centralized API service that provides access to all domain services
 * with consistent error handling and logging
 */

import { apiClient } from './client';
import { authService } from './authService';
import { budgetService } from './budgetService';
import { envelopeService } from './envelopeService';
import { userService } from './userService';
import { transformError, logError, showError } from './errors';

class ApiService {
  // Domain services
  readonly auth = authService;
  readonly budgets = budgetService;
  readonly envelopes = envelopeService;
  readonly users = userService;

  /**
   * Get direct access to the client for advanced operations
   */
  getClient() {
    return apiClient;
  }

  /**
   * Perform health check
   */
  async healthCheck() {
    try {
      const result = await apiClient.healthCheck();
      return result;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'ApiService.healthCheck');
      throw apiError;
    }
  }

  /**
   * Handle API errors globally
   */
  handleError(error: any, context?: string, options?: {
    showToUser?: boolean;
    allowRetry?: boolean;
    onRetry?: () => void;
  }) {
    const apiError = transformError(error);
    logError(apiError, context);

    if (options?.showToUser) {
      showError(apiError, {
        onRetry: options.allowRetry ? options.onRetry : undefined,
      });
    }

    return apiError;
  }

  /**
   * Execute API operation with consistent error handling
   */
  async execute<T>(
    operation: () => Promise<T>,
    context?: string,
    options?: {
      showErrorToUser?: boolean;
      allowRetry?: boolean;
      onRetry?: () => void;
    }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const apiError = this.handleError(error, context, {
        showToUser: options?.showErrorToUser,
        allowRetry: options?.allowRetry,
        onRetry: options?.onRetry,
      });
      throw apiError;
    }
  }
}

export const apiService = new ApiService();