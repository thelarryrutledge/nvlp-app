/**
 * useOfflineQueue Hook
 * 
 * React hook for monitoring and interacting with the offline queue
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineQueue, QueuedRequest } from '../services/api/offlineQueue';
import { isOfflineQueuedError, getQueuedRequestInfo } from '../services/api/offlineInterceptor';

export interface OfflineQueueState {
  queue: QueuedRequest[];
  stats: {
    total: number;
    byPriority: Record<string, number>;
    oldestTimestamp: number | null;
    processing: boolean;
  };
  isProcessing: boolean;
}

export interface UseOfflineQueueReturn {
  state: OfflineQueueState;
  actions: {
    removeRequest: (requestId: string) => Promise<boolean>;
    clearQueue: () => Promise<void>;
    processQueue: () => Promise<void>;
    retryRequest: (requestId: string) => Promise<void>;
  };
  utils: {
    isOfflineQueuedError: typeof isOfflineQueuedError;
    getQueuedRequestInfo: typeof getQueuedRequestInfo;
    formatQueuedTime: (timestamp: number) => string;
    getQueuedRequestsByPriority: (priority: 'high' | 'medium' | 'low') => QueuedRequest[];
  };
}

/**
 * Hook for managing offline queue state
 */
export function useOfflineQueue(): UseOfflineQueueReturn {
  const [state, setState] = useState<OfflineQueueState>({
    queue: [],
    stats: {
      total: 0,
      byPriority: {},
      oldestTimestamp: null,
      processing: false,
    },
    isProcessing: false,
  });

  // Update state when queue changes
  const updateState = useCallback((queue: QueuedRequest[]) => {
    const stats = offlineQueue.getStats();
    setState({
      queue,
      stats,
      isProcessing: stats.processing,
    });
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    // Get initial state
    const initialQueue = offlineQueue.getQueue();
    updateState(initialQueue);

    // Subscribe to changes
    const unsubscribe = offlineQueue.addListener(updateState);

    return unsubscribe;
  }, [updateState]);

  // Actions
  const removeRequest = useCallback(async (requestId: string): Promise<boolean> => {
    return await offlineQueue.removeRequest(requestId);
  }, []);

  const clearQueue = useCallback(async (): Promise<void> => {
    await offlineQueue.clearQueue();
  }, []);

  const processQueue = useCallback(async (): Promise<void> => {
    await offlineQueue.processQueue();
  }, []);

  const retryRequest = useCallback(async (requestId: string): Promise<void> => {
    // Find the request in the queue
    const request = state.queue.find(req => req.id === requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found in queue`);
    }

    // Reset retry count and process
    request.retryCount = 0;
    await offlineQueue.processQueue();
  }, [state.queue]);

  // Utilities
  const formatQueuedTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }, []);

  const getQueuedRequestsByPriority = useCallback((priority: 'high' | 'medium' | 'low'): QueuedRequest[] => {
    return state.queue.filter(req => 
      (req.metadata?.priority || 'medium') === priority
    );
  }, [state.queue]);

  return {
    state,
    actions: {
      removeRequest,
      clearQueue,
      processQueue,
      retryRequest,
    },
    utils: {
      isOfflineQueuedError,
      getQueuedRequestInfo,
      formatQueuedTime,
      getQueuedRequestsByPriority,
    },
  };
}

/**
 * Hook for simplified queue monitoring
 */
export function useOfflineQueueStatus() {
  const { state } = useOfflineQueue();
  
  return {
    hasQueuedRequests: state.stats.total > 0,
    queuedCount: state.stats.total,
    isProcessing: state.isProcessing,
    oldestRequest: state.stats.oldestTimestamp,
    priorityBreakdown: state.stats.byPriority,
  };
}

/**
 * Hook for handling offline queued errors in components
 */
export function useOfflineErrorHandler() {
  const { utils } = useOfflineQueue();
  
  const handleError = useCallback((error: any) => {
    if (utils.isOfflineQueuedError(error)) {
      const queueInfo = utils.getQueuedRequestInfo(error);
      if (queueInfo) {
        return {
          isOfflineQueued: true,
          requestId: queueInfo.requestId,
          queuedAt: queueInfo.queuedAt,
          message: 'Request has been queued and will be sent when you\'re back online',
        };
      }
    }
    
    return {
      isOfflineQueued: false,
      message: error.message || 'An error occurred',
    };
  }, [utils]);
  
  return { handleError };
}