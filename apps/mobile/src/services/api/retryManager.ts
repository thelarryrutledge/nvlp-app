/**
 * Retry Manager
 * 
 * Handles automatic retry logic for failed API requests
 */

import { RequestConfig } from './interceptors';
import { networkUtils } from './networkUtils';
import { isOfflineQueuedError } from './offlineInterceptor';

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  maxRetryDelay: number;
  retryableStatusCodes: number[];
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, retryCount: number) => void;
}

export interface RetryableRequest {
  config: RequestConfig;
  execute: () => Promise<any>;
  retryConfig?: Partial<RetryConfig>;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  maxRetryDelay: 30000, // 30 seconds
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

class RetryManager {
  private defaultConfig: RetryConfig;
  private activeRetries: Map<string, AbortController> = new Map();

  constructor(defaultConfig?: Partial<RetryConfig>) {
    this.defaultConfig = { ...DEFAULT_RETRY_CONFIG, ...defaultConfig };
  }

  /**
   * Execute a request with automatic retry logic
   */
  async executeWithRetry<T>(request: RetryableRequest): Promise<T> {
    const config = { ...this.defaultConfig, ...request.retryConfig };
    const requestId = this.generateRequestId(request.config);
    
    // Create abort controller for this request
    const abortController = new AbortController();
    this.activeRetries.set(requestId, abortController);

    try {
      return await this.attemptRequest<T>(
        request,
        config,
        1,
        abortController.signal
      );
    } finally {
      this.activeRetries.delete(requestId);
    }
  }

  /**
   * Attempt to execute a request with retry logic
   */
  private async attemptRequest<T>(
    request: RetryableRequest,
    config: RetryConfig,
    attempt: number,
    signal: AbortSignal
  ): Promise<T> {
    try {
      // Check if request was aborted
      if (signal.aborted) {
        throw new Error('Request was aborted');
      }

      // Update attempt metadata
      if (!request.config.metadata) {
        request.config.metadata = {};
      }
      request.config.metadata.attempt = attempt;

      // Execute the request
      const result = await request.execute();
      
      // Request succeeded
      console.log(`[RetryManager] Request succeeded on attempt ${attempt}`);
      return result;

    } catch (error: any) {
      // Check if this is an offline queued error (don't retry these)
      if (isOfflineQueuedError(error)) {
        throw error;
      }

      // Check if request was aborted
      if (signal.aborted || error.name === 'AbortError') {
        throw new Error('Request was aborted');
      }

      // Check if we should retry
      const shouldRetry = this.shouldRetry(error, config, attempt);
      
      if (!shouldRetry) {
        console.error(`[RetryManager] Request failed after ${attempt} attempt(s), not retrying`, error);
        throw error;
      }

      // Calculate retry delay
      const delay = this.calculateRetryDelay(attempt, config);
      
      console.log(`[RetryManager] Request failed on attempt ${attempt}, retrying after ${delay}ms`, {
        error: error.message,
        status: error.response?.status,
        nextAttempt: attempt + 1,
        maxRetries: config.maxRetries,
      });

      // Call onRetry callback if provided
      if (config.onRetry) {
        try {
          config.onRetry(error, attempt);
        } catch (callbackError) {
          console.error('[RetryManager] onRetry callback error:', callbackError);
        }
      }

      // Wait before retrying
      await this.delay(delay, signal);

      // Check network connectivity before retry
      if (!networkUtils.isConnected()) {
        console.log('[RetryManager] Waiting for network connection before retry...');
        const connected = await networkUtils.waitForConnection(30000);
        if (!connected) {
          throw new Error('Network connection timeout during retry');
        }
      }

      // Retry the request
      return this.attemptRequest<T>(
        request,
        config,
        attempt + 1,
        signal
      );
    }
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetry(error: any, config: RetryConfig, attempt: number): boolean {
    // Check if we have retries left
    if (attempt >= config.maxRetries) {
      return false;
    }

    // Use custom retry condition if provided
    if (config.retryCondition) {
      return config.retryCondition(error);
    }

    // Network errors are retryable
    if (!error.response && error.code !== 'ABORT_ERR') {
      return true;
    }

    // Check status code
    const status = error.response?.status;
    if (status && config.retryableStatusCodes.includes(status)) {
      return true;
    }

    // Timeout errors are retryable
    if (error.code === 'TIMEOUT' || error.code === 'ECONNABORTED') {
      return true;
    }

    // Connection errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff with jitter
    const exponentialDelay = config.retryDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = Math.min(exponentialDelay + jitter, config.maxRetryDelay);
    
    return Math.round(delay);
  }

  /**
   * Delay with abort signal support
   */
  private async delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      
      const abortHandler = () => {
        clearTimeout(timeout);
        reject(new Error('Delay aborted'));
      };
      
      signal.addEventListener('abort', abortHandler, { once: true });
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(config: RequestConfig): string {
    return `${config.method}_${config.url}_${Date.now()}`;
  }

  /**
   * Abort a specific request
   */
  abortRequest(requestId: string): boolean {
    const controller = this.activeRetries.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRetries.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Abort all active retries
   */
  abortAll(): number {
    const count = this.activeRetries.size;
    this.activeRetries.forEach(controller => controller.abort());
    this.activeRetries.clear();
    return count;
  }

  /**
   * Get active retry count
   */
  getActiveRetryCount(): number {
    return this.activeRetries.size;
  }

  /**
   * Update default configuration
   */
  updateDefaultConfig(config: Partial<RetryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

// Create singleton instance
export const retryManager = new RetryManager();

// Export for testing
export { RetryManager };

/**
 * Helper function to create a retryable request
 */
export function createRetryableRequest(
  config: RequestConfig,
  execute: () => Promise<any>,
  retryConfig?: Partial<RetryConfig>
): RetryableRequest {
  return {
    config,
    execute,
    ...(retryConfig && { retryConfig }),
  };
}