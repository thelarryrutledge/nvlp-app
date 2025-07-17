/**
 * API Interceptors
 * 
 * Request/response interceptors for API operations
 * Handles authentication, logging, error transformation, and retry logic
 */

import { networkUtils } from './networkUtils';
import { transformError, logError } from './errors';
import type { ApiError } from './errors';

export interface RequestInterceptor {
  id: string;
  handler: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
}

export interface ResponseInterceptor {
  id: string;
  fulfilled: (response: any) => any;
  rejected?: (error: any) => Promise<any> | any;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: any;
  timeout?: number;
  retries?: number;
  metadata?: {
    startTime?: number;
    attempt?: number;
    context?: string;
  };
}

class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    
    // Return unsubscribe function
    return () => {
      const index = this.requestInterceptors.findIndex(i => i.id === interceptor.id);
      if (index > -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    
    // Return unsubscribe function
    return () => {
      const index = this.responseInterceptors.findIndex(i => i.id === interceptor.id);
      if (index > -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Process request through all interceptors
   */
  async processRequest(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = { ...config };
    
    for (const interceptor of this.requestInterceptors) {
      try {
        processedConfig = await interceptor.handler(processedConfig);
      } catch (error) {
        console.error(`Request interceptor ${interceptor.id} failed:`, error);
        // Continue with other interceptors
      }
    }
    
    return processedConfig;
  }

  /**
   * Process response through all interceptors
   */
  async processResponse(response: any, config: RequestConfig): Promise<any> {
    let processedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      try {
        processedResponse = await interceptor.fulfilled(processedResponse);
      } catch (error) {
        console.error(`Response interceptor ${interceptor.id} failed:`, error);
        // Continue with other interceptors
      }
    }
    
    return processedResponse;
  }

  /**
   * Process error through all interceptors
   */
  async processError(error: any, config: RequestConfig): Promise<any> {
    let processedError = error;
    
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.rejected) {
        try {
          processedError = await interceptor.rejected(processedError);
        } catch (newError) {
          console.error(`Error interceptor ${interceptor.id} failed:`, newError);
          // Continue with other interceptors
        }
      }
    }
    
    return processedError;
  }
}

// Create singleton instance
export const interceptorManager = new InterceptorManager();

/**
 * Built-in interceptors
 */

// Request logging interceptor
export const requestLoggingInterceptor: RequestInterceptor = {
  id: 'request-logging',
  handler: (config) => {
    const startTime = Date.now();
    config.metadata = { ...config.metadata, startTime };
    
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data,
    });
    
    return config;
  },
};

// Response logging interceptor
export const responseLoggingInterceptor: ResponseInterceptor = {
  id: 'response-logging',
  fulfilled: (response) => {
    console.log('[API Response]', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  rejected: (error) => {
    console.error('[API Error]', error);
    return Promise.reject(error);
  },
};

// Network connectivity interceptor
export const networkInterceptor: RequestInterceptor = {
  id: 'network-check',
  handler: async (config) => {
    const isConnected = networkUtils.isConnected();
    
    if (!isConnected) {
      throw new Error('No network connection available');
    }
    
    // Add network type to headers for debugging
    const networkState = networkUtils.getCurrentState();
    config.headers['X-Network-Type'] = networkState.type || 'unknown';
    
    return config;
  },
};

// Authentication header interceptor
export const authInterceptor: RequestInterceptor = {
  id: 'auth-header',
  handler: (config) => {
    // Note: This will be enhanced when we implement token management
    // For now, it's a placeholder that ensures auth headers are set
    
    // The actual token will be set by the NVLP client's transport layer
    // This interceptor can add additional auth-related headers if needed
    config.headers['X-Client-Type'] = 'react-native';
    config.headers['X-Client-Version'] = '1.0.0';
    
    return config;
  },
};

// Retry interceptor
export const retryInterceptor: ResponseInterceptor = {
  id: 'retry-logic',
  fulfilled: (response) => response,
  rejected: async (error) => {
    const config = error.config;
    const maxRetries = config?.retries || 3;
    const currentAttempt = config?.metadata?.attempt || 1;
    
    // Determine if error is retryable
    const isRetryable = isRetryableError(error);
    const hasRetriesLeft = currentAttempt < maxRetries;
    
    if (isRetryable && hasRetriesLeft) {
      console.log(`[Retry] Attempting retry ${currentAttempt + 1}/${maxRetries} for ${config?.url}`);
      
      // Update attempt count
      if (config?.metadata) {
        config.metadata.attempt = currentAttempt + 1;
      }
      
      // Exponential backoff delay
      const delay = Math.min(1000 * Math.pow(2, currentAttempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Check network connectivity before retry
      if (!networkUtils.isConnected()) {
        console.log('[Retry] Waiting for network connection...');
        const connected = await networkUtils.waitForConnection(30000);
        if (!connected) {
          throw transformError(new Error('Network connection timeout during retry'));
        }
      }
      
      // Return a promise that will retry the request
      // Note: The actual retry implementation depends on the transport layer
      throw error; // For now, we'll let the upper layer handle the retry
    }
    
    // Transform and log the error
    const apiError = transformError(error);
    logError(apiError, 'RetryInterceptor');
    
    throw apiError;
  },
};

// Performance monitoring interceptor
export const performanceInterceptor: ResponseInterceptor = {
  id: 'performance-monitoring',
  fulfilled: (response) => {
    const config = response.config;
    const startTime = config?.metadata?.startTime;
    
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`[Performance] ${config.method?.toUpperCase()} ${config.url} completed in ${duration}ms`);
      
      // Log slow requests
      if (duration > 5000) {
        console.warn(`[Performance] Slow request detected: ${duration}ms for ${config.url}`);
      }
    }
    
    return response;
  },
  rejected: (error) => {
    const config = error.config;
    const startTime = config?.metadata?.startTime;
    
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`[Performance] ${config?.method?.toUpperCase()} ${config?.url} failed after ${duration}ms`);
    }
    
    return Promise.reject(error);
  },
};

/**
 * Helper function to determine if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (!error.response) {
    return true;
  }
  
  // Server errors (5xx) are retryable
  const status = error.response?.status;
  if (status >= 500 && status < 600) {
    return true;
  }
  
  // Rate limiting (429) is retryable
  if (status === 429) {
    return true;
  }
  
  // Timeout errors are retryable
  if (error.code === 'TIMEOUT' || error.code === 'ECONNABORTED') {
    return true;
  }
  
  return false;
}

/**
 * Initialize default interceptors
 */
export function initializeInterceptors() {
  interceptorManager.addRequestInterceptor(authInterceptor);
  interceptorManager.addRequestInterceptor(networkInterceptor);
  interceptorManager.addRequestInterceptor(requestLoggingInterceptor);
  
  interceptorManager.addResponseInterceptor(responseLoggingInterceptor);
  interceptorManager.addResponseInterceptor(retryInterceptor);
  interceptorManager.addResponseInterceptor(performanceInterceptor);
  
  console.log('[Interceptors] Default interceptors initialized');
}