/**
 * useApiService Hook
 * 
 * React hook for using API services with error handling and loading states
 */

import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { ApiError } from '../services/api';

interface UseApiServiceState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

interface UseApiServiceReturn<T> extends UseApiServiceState<T> {
  execute: (operation: () => Promise<T>, options?: {
    showErrorToUser?: boolean;
    resetState?: boolean;
  }) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for executing API operations with consistent state management
 */
export function useApiService<T = any>(): UseApiServiceReturn<T> {
  const [state, setState] = useState<UseApiServiceState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: {
      showErrorToUser?: boolean;
      resetState?: boolean;
    }
  ): Promise<T | null> => {
    try {
      if (options?.resetState !== false) {
        setState(prev => ({
          ...prev,
          loading: true,
          error: null,
        }));
      }

      const result = await apiService.execute(
        operation,
        undefined,
        { showErrorToUser: options?.showErrorToUser }
      );

      setState({
        data: result,
        loading: false,
        error: null,
      });

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as ApiError,
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for budget operations
 */
export function useBudgets() {
  const { execute, data, loading, error, reset } = useApiService();

  const getBudgets = useCallback(() => {
    return execute(() => apiService.budgets.getBudgets(), { showErrorToUser: true });
  }, [execute]);

  const createBudget = useCallback((input: any) => {
    return execute(() => apiService.budgets.createBudget(input), { showErrorToUser: true });
  }, [execute]);

  const updateBudget = useCallback((id: string, updates: any) => {
    return execute(() => apiService.budgets.updateBudget(id, updates), { showErrorToUser: true });
  }, [execute]);

  const deleteBudget = useCallback((id: string) => {
    return execute(() => apiService.budgets.deleteBudget(id), { showErrorToUser: true });
  }, [execute]);

  return {
    budgets: data,
    loading,
    error,
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    reset,
  };
}

/**
 * Hook for envelope operations
 */
export function useEnvelopes() {
  const { execute, data, loading, error, reset } = useApiService();

  const getEnvelopes = useCallback((budgetId?: string) => {
    return execute(() => apiService.envelopes.getEnvelopes(budgetId), { showErrorToUser: true });
  }, [execute]);

  const createEnvelope = useCallback((input: any) => {
    return execute(() => apiService.envelopes.createEnvelope(input), { showErrorToUser: true });
  }, [execute]);

  const updateEnvelope = useCallback((id: string, updates: any) => {
    return execute(() => apiService.envelopes.updateEnvelope(id, updates), { showErrorToUser: true });
  }, [execute]);

  const deleteEnvelope = useCallback((id: string) => {
    return execute(() => apiService.envelopes.deleteEnvelope(id), { showErrorToUser: true });
  }, [execute]);

  return {
    envelopes: data,
    loading,
    error,
    getEnvelopes,
    createEnvelope,
    updateEnvelope,
    deleteEnvelope,
    reset,
  };
}

/**
 * Hook for user profile operations
 */
export function useUserProfile() {
  const { execute, data, loading, error, reset } = useApiService();

  const getProfile = useCallback(() => {
    return execute(() => apiService.users.getProfile(), { showErrorToUser: true });
  }, [execute]);

  const updateProfile = useCallback((updates: any) => {
    return execute(() => apiService.users.updateProfile(updates), { showErrorToUser: true });
  }, [execute]);

  return {
    profile: data,
    loading,
    error,
    getProfile,
    updateProfile,
    reset,
  };
}