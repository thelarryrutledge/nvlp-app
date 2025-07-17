/**
 * Offline Queue System
 * 
 * Manages API requests when offline by queuing them and retrying when online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkUtils } from './networkUtils';
import { enhancedApiClient } from './clientWrapper';
import { RequestConfig } from './interceptors';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  metadata?: {
    userId?: string;
    priority?: 'high' | 'medium' | 'low';
    context?: string;
  };
}

export interface OfflineQueueOptions {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  persistQueue: boolean;
  storageKey: string;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private retryTimer: NodeJS.Timeout | null = null;
  private listeners: ((queue: QueuedRequest[]) => void)[] = [];

  private options: OfflineQueueOptions = {
    maxQueueSize: 100,
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    persistQueue: true,
    storageKey: '@nvlp:offline_queue',
  };

  constructor(options?: Partial<OfflineQueueOptions>) {
    this.options = { ...this.options, ...options };
    this.initialize();
  }

  /**
   * Initialize the offline queue
   */
  private async initialize() {
    // Load persisted queue
    await this.loadPersistedQueue();

    // Listen for network changes
    networkUtils.addListener((networkState) => {
      if (networkState.isConnected && networkState.isInternetReachable) {
        this.processQueue();
      }
    });

    // Start processing if already online
    if (networkUtils.isConnected()) {
      this.processQueue();
    }
  }

  /**
   * Add a request to the offline queue
   */
  async addRequest(config: RequestConfig): Promise<string> {
    const request: QueuedRequest = {
      id: this.generateRequestId(),
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.options.maxRetries,
      ...(config.metadata && { metadata: config.metadata }),
    };

    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove oldest low-priority request
      this.removeOldestLowPriorityRequest();
    }

    this.queue.push(request);
    
    // Sort by priority and timestamp
    this.queue.sort(this.compareRequests);

    // Persist queue
    await this.persistQueue();

    // Notify listeners
    this.notifyListeners();

    console.log(`[OfflineQueue] Added request: ${request.method} ${request.url}`);
    return request.id;
  }

  /**
   * Remove a request from the queue
   */
  async removeRequest(requestId: string): Promise<boolean> {
    const index = this.queue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.persistQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Get current queue
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Clear all requests from queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
    this.notifyListeners();
  }

  /**
   * Process queued requests
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    if (!networkUtils.isConnected()) {
      console.log('[OfflineQueue] Network not available, skipping processing');
      return;
    }

    this.isProcessing = true;
    console.log(`[OfflineQueue] Processing ${this.queue.length} queued requests`);

    const requestsToProcess = [...this.queue];
    
    for (const request of requestsToProcess) {
      try {
        await this.processRequest(request);
      } catch (error) {
        console.error(`[OfflineQueue] Failed to process request ${request.id}:`, error);
        await this.handleRequestFailure(request);
      }
    }

    this.isProcessing = false;
    
    // Schedule next processing if queue is not empty
    if (this.queue.length > 0) {
      this.scheduleNextProcessing();
    }
  }

  /**
   * Process a single request
   */
  private async processRequest(request: QueuedRequest): Promise<void> {
    console.log(`[OfflineQueue] Processing request: ${request.method} ${request.url}`);

    try {
      // Execute the request through the enhanced API client
      const response = await enhancedApiClient.request(
        request.method,
        request.url,
        request.data,
        { 
          ...(request.headers && { headers: request.headers }),
          timeout: 10000, // 10 second timeout for queued requests
        }
      );

      // Request succeeded, remove from queue
      await this.removeRequest(request.id);
      console.log(`[OfflineQueue] Request completed successfully: ${request.id}`);
      
    } catch (error) {
      console.warn(`[OfflineQueue] Request failed: ${request.id}`, error);
      throw error;
    }
  }

  /**
   * Handle request failure
   */
  private async handleRequestFailure(request: QueuedRequest): Promise<void> {
    request.retryCount++;
    
    if (request.retryCount >= request.maxRetries) {
      // Max retries reached, remove from queue
      await this.removeRequest(request.id);
      console.error(`[OfflineQueue] Request ${request.id} failed after ${request.maxRetries} attempts`);
      
      // Could emit event for failed request handling
      this.notifyRequestFailed(request);
    } else {
      // Update request in queue
      const index = this.queue.findIndex(req => req.id === request.id);
      if (index !== -1) {
        this.queue[index] = request;
        await this.persistQueue();
        this.notifyListeners();
      }
    }
  }

  /**
   * Schedule next processing attempt
   */
  private scheduleNextProcessing(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = setTimeout(() => {
      this.processQueue();
    }, this.options.retryDelay);
  }

  /**
   * Load persisted queue from storage
   */
  private async loadPersistedQueue(): Promise<void> {
    if (!this.options.persistQueue) return;

    try {
      const queueData = await AsyncStorage.getItem(this.options.storageKey);
      if (queueData) {
        const parsedQueue = JSON.parse(queueData);
        this.queue = Array.isArray(parsedQueue) ? parsedQueue : [];
        console.log(`[OfflineQueue] Loaded ${this.queue.length} persisted requests`);
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load persisted queue:', error);
    }
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    if (!this.options.persistQueue) return;

    try {
      await AsyncStorage.setItem(this.options.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to persist queue:', error);
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compare requests for sorting (priority, then timestamp)
   */
  private compareRequests(a: QueuedRequest, b: QueuedRequest): number {
    // Priority order: high > medium > low
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.metadata?.priority || 'medium'];
    const bPriority = priorityOrder[b.metadata?.priority || 'medium'];

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    // Same priority, sort by timestamp (oldest first)
    return a.timestamp - b.timestamp;
  }

  /**
   * Remove oldest low-priority request to make room
   */
  private removeOldestLowPriorityRequest(): void {
    const lowPriorityIndex = this.queue.findIndex(
      req => req.metadata?.priority === 'low' || !req.metadata?.priority
    );
    
    if (lowPriorityIndex !== -1) {
      this.queue.splice(lowPriorityIndex, 1);
    } else {
      // No low priority requests, remove oldest
      this.queue.shift();
    }
  }

  /**
   * Add listener for queue changes
   */
  addListener(listener: (queue: QueuedRequest[]) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.queue]);
      } catch (error) {
        console.error('[OfflineQueue] Listener error:', error);
      }
    });
  }

  /**
   * Notify about failed request
   */
  private notifyRequestFailed(request: QueuedRequest): void {
    // Could emit custom event or call specific handlers
    console.warn(`[OfflineQueue] Request permanently failed: ${request.method} ${request.url}`);
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    byPriority: Record<string, number>;
    oldestTimestamp: number | null;
    processing: boolean;
  } {
    const byPriority = this.queue.reduce((acc, req) => {
      const priority = req.metadata?.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const oldestTimestamp = this.queue.length > 0 
      ? Math.min(...this.queue.map(req => req.timestamp))
      : null;

    return {
      total: this.queue.length,
      byPriority,
      oldestTimestamp,
      processing: this.isProcessing,
    };
  }
}

// Create singleton instance
export const offlineQueue = new OfflineQueue();

// Export for testing
export { OfflineQueue };