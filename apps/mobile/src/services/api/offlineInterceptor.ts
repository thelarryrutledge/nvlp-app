/**
 * Offline Interceptor
 * 
 * Intercepts API requests when offline and adds them to the offline queue
 */

import { RequestInterceptor, RequestConfig } from './interceptors';
import { offlineQueue } from './offlineQueue';
import { networkUtils } from './networkUtils';

/**
 * Offline request interceptor
 * Queues requests when offline instead of failing immediately
 */
export const offlineInterceptor: RequestInterceptor = {
  id: 'offline-queue',
  handler: async (config: RequestConfig): Promise<RequestConfig> => {
    const networkState = networkUtils.getCurrentState();
    const isOnline = networkState.isConnected && networkState.isInternetReachable;

    // If we're offline and this is a queueable request
    if (!isOnline && shouldQueueRequest(config)) {
      console.log(`[OfflineInterceptor] Queueing offline request: ${config.method} ${config.url}`);
      
      // Add request to offline queue
      const requestId = await offlineQueue.addRequest(config);
      
      // Throw a special error that can be caught and handled
      const offlineError = new Error('Request queued for when online');
      (offlineError as any).isOfflineQueued = true;
      (offlineError as any).requestId = requestId;
      (offlineError as any).queuedAt = Date.now();
      
      throw offlineError;
    }

    // Request can proceed normally
    return config;
  },
};

/**
 * Determine if a request should be queued when offline
 */
function shouldQueueRequest(config: RequestConfig): boolean {
  // Don't queue GET requests (they're usually for fetching data)
  if (config.method.toLowerCase() === 'get') {
    return false;
  }

  // Don't queue authentication requests (they need immediate response)
  if (config.url.includes('/auth/')) {
    return false;
  }

  // Don't queue real-time or time-sensitive requests
  const timeSernsitivePatterns = [
    '/realtime/',
    '/stream/',
    '/live/',
    '/notifications/',
  ];

  if (timeSernsitivePatterns.some(pattern => config.url.includes(pattern))) {
    return false;
  }

  // Queue other mutating requests (POST, PUT, PATCH, DELETE)
  const queueableMethods = ['post', 'put', 'patch', 'delete'];
  return queueableMethods.includes(config.method.toLowerCase());
}

/**
 * Check if an error is from offline queuing
 */
export function isOfflineQueuedError(error: any): boolean {
  return error && error.isOfflineQueued === true;
}

/**
 * Get queued request info from error
 */
export function getQueuedRequestInfo(error: any): {
  requestId: string;
  queuedAt: number;
} | null {
  if (isOfflineQueuedError(error)) {
    return {
      requestId: error.requestId,
      queuedAt: error.queuedAt,
    };
  }
  return null;
}