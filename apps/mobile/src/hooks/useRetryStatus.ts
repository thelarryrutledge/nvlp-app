/**
 * useRetryStatus Hook
 * 
 * React hook for monitoring retry operations
 */

import { useState, useEffect, useCallback } from 'react';
import { enhancedApiClient } from '../services/api/clientWrapper';
import { retryManager } from '../services/api/retryManager';

export interface RetryStatus {
  activeRetries: number;
  lastRetryError?: {
    message: string;
    timestamp: number;
    attempts: number;
  };
}

export interface UseRetryStatusReturn {
  status: RetryStatus;
  actions: {
    abortAll: () => number;
    updateRetryConfig: (config: any) => void;
  };
}

/**
 * Hook for monitoring retry status
 */
export function useRetryStatus(): UseRetryStatusReturn {
  const [status, setStatus] = useState<RetryStatus>({
    activeRetries: 0,
  });

  // Poll for active retry count
  useEffect(() => {
    const updateStatus = () => {
      const activeRetries = enhancedApiClient.getActiveRetryCount();
      setStatus(prev => ({
        ...prev,
        activeRetries,
      }));
    };

    // Initial update
    updateStatus();

    // Poll every second while there are active retries
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // Actions
  const abortAll = useCallback(() => {
    return enhancedApiClient.abortAllRetries();
  }, []);

  const updateRetryConfig = useCallback((config: any) => {
    enhancedApiClient.updateRetryConfig(config);
  }, []);

  return {
    status,
    actions: {
      abortAll,
      updateRetryConfig,
    },
  };
}

/**
 * Hook for creating retryable operations with custom config
 */
export function useRetryableOperation<T = any>() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    config?: {
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (error: any, attempt: number) => void;
    }
  ): Promise<T> => {
    setIsRetrying(true);
    setRetryCount(0);
    setLastError(null);

    try {
      // Create a wrapped operation that tracks retry attempts
      const wrappedOperation = async () => {
        try {
          return await operation();
        } catch (error: any) {
          setLastError(error);
          throw error;
        }
      };

      // Execute with retry config
      const result = await enhancedApiClient.request<T>(
        'CUSTOM',
        'custom-operation',
        null,
        {
          retryConfig: {
            ...config,
            onRetry: (error, attempt) => {
              setRetryCount(attempt);
              if (config?.onRetry) {
                config.onRetry(error, attempt);
              }
            },
          },
        }
      );

      return result;
    } finally {
      setIsRetrying(false);
    }
  }, []);

  return {
    execute,
    isRetrying,
    retryCount,
    lastError,
  };
}