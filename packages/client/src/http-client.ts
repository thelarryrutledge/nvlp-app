/**
 * Base HTTP client with retry logic for NVLP API
 */

// Type declarations for browser globals
declare const window: any;

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  shouldRetry?: (error: any) => boolean;
}

export interface TokenProvider {
  getToken(): Promise<string | null>;
  refreshToken(): Promise<string>;
  isTokenExpired(token: string): boolean;
}

export interface OfflineQueueConfig {
  enabled?: boolean;
  maxSize?: number;
  storage?: OfflineStorage;
  retryOnReconnect?: boolean;
}

export interface OfflineStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface QueuedRequest {
  id: string;
  url: string;
  config: RequestConfig;
  timestamp: number;
  retryCount: number;
}

export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retryOptions?: RetryOptions;
  tokenProvider?: TokenProvider;
  offlineQueue?: OfflineQueueConfig;
  deviceId?: string;
}

export interface RequestConfig extends Omit<RequestInit, 'body' | 'headers'> {
  timeout?: number;
  retryOptions?: RetryOptions;
  body?: any;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly response: Response;

  constructor(response: Response, message?: string) {
    super(message || `HTTP ${response.status}: ${response.statusText}`);
    this.name = 'HttpError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.response = response;
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

export class SessionInvalidatedError extends Error {
  code = 'SESSION_INVALIDATED'
  constructor(message: string) {
    super(message)
    this.name = 'SessionInvalidatedError'
  }
}

/**
 * Default in-memory storage for offline queue
 */
class MemoryStorage implements OfflineStorage {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

/**
 * Offline queue for managing failed requests
 */
class OfflineQueue {
  private config: Required<OfflineQueueConfig>;
  private storage: OfflineStorage;
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private readonly STORAGE_KEY = 'nvlp_offline_queue';

  constructor(config: OfflineQueueConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxSize: config.maxSize ?? 50,
      storage: config.storage ?? new MemoryStorage(),
      retryOnReconnect: config.retryOnReconnect ?? true,
    };
    this.storage = this.config.storage;
    
    // Load queue from storage on initialization
    this.loadQueue();

    // Set up connectivity listeners for auto-retry
    if (this.config.retryOnReconnect && typeof window !== 'undefined' && window.addEventListener) {
      (window as any).addEventListener('online', () => this.processQueue());
    }
  }

  /**
   * Add a request to the offline queue
   */
  async enqueue(url: string, config: RequestConfig): Promise<void> {
    if (!this.config.enabled) return;

    const request: QueuedRequest = {
      id: this.generateId(),
      url,
      config: { ...config },
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Remove oldest requests if queue is full
    while (this.queue.length >= this.config.maxSize) {
      this.queue.shift();
    }

    this.queue.push(request);
    await this.saveQueue();
  }

  /**
   * Process all queued requests
   */
  async processQueue(): Promise<void> {
    if (!this.config.enabled || this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Process requests one by one to avoid overwhelming the server
    const requestsToProcess = [...this.queue];
    const failedRequests: QueuedRequest[] = [];

    for (const request of requestsToProcess) {
      try {
        // Remove request from queue before processing
        this.queue = this.queue.filter(r => r.id !== request.id);
        
        // Attempt to execute the request
        await this.executeRequest(request);
        
        // Request succeeded, continue to next
      } catch (error) {
        // Request failed, increment retry count
        request.retryCount++;
        
        // If we haven't exceeded max retries, add back to queue
        if (request.retryCount < 3) {
          failedRequests.push(request);
        }
        // Otherwise, drop the request (could emit an event here)
      }
    }

    // Add failed requests back to the queue
    this.queue.push(...failedRequests);
    
    await this.saveQueue();
    this.isProcessing = false;
  }

  /**
   * Get the current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the entire queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  /**
   * Check if a request should be queued based on the error
   */
  shouldQueue(error: any): boolean {
    // Queue network errors and 5xx server errors, but not auth or client errors
    if (error instanceof NetworkError) return true;
    if (error instanceof TimeoutError) return true;
    if (error instanceof HttpError) {
      return error.status >= 500 && error.status < 600;
    }
    return false;
  }

  private async executeRequest(_request: QueuedRequest): Promise<any> {
    // This will be set by the HttpClient
    throw new Error('executeRequest must be implemented by HttpClient');
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await this.storage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue from storage:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await this.storage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save offline queue to storage:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // Method to be overridden by HttpClient
  setRequestExecutor(executor: (request: QueuedRequest) => Promise<any>): void {
    this.executeRequest = executor;
  }
}

/**
 * Retry logic implementation
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    shouldRetry = (error: any) => {
      // Retry on network errors and 5xx server errors
      if (error instanceof NetworkError) return true;
      if (error instanceof HttpError) {
        return error.status >= 500 && error.status < 600;
      }
      return false;
    }
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === maxAttempts - 1) {
        throw error;
      }

      const waitTime = backoff === 'exponential' 
        ? delay * Math.pow(2, attempt)
        : delay * (attempt + 1);

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

/**
 * Create a timeout-aware fetch wrapper
 */
function createTimeoutFetch(timeout: number) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new TimeoutError(timeout);
      }
      
      throw new NetworkError('Network request failed', error);
    }
  };
}

/**
 * Base HTTP client with automatic retry logic and token refresh
 */
export class HttpClient {
  private config: HttpClientConfig;
  private defaultRetryOptions: RetryOptions;
  private offlineQueue?: OfflineQueue;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  constructor(config: HttpClientConfig) {
    this.config = config;
    this.defaultRetryOptions = config.retryOptions || {
      maxAttempts: 3,
      delay: 1000,
      backoff: 'exponential',
    };

    // Initialize offline queue if enabled
    if (config.offlineQueue?.enabled !== false) {
      this.offlineQueue = new OfflineQueue(config.offlineQueue);
      
      // Set up the request executor for the offline queue
      this.offlineQueue.setRequestExecutor(async (queuedRequest) => {
        return this.executeRequestInternal(queuedRequest.url, queuedRequest.config);
      });
    }
  }

  /**
   * Update the base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }

  /**
   * Update default headers
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.config.defaultHeaders = { ...this.config.defaultHeaders, ...headers };
  }

  /**
   * Clear a default header
   */
  clearDefaultHeader(key: string): void {
    if (this.config.defaultHeaders) {
      delete this.config.defaultHeaders[key];
    }
  }

  /**
   * Set device ID for all requests
   */
  setDeviceId(deviceId: string): void {
    this.config.deviceId = deviceId;
  }

  /**
   * Get current device ID
   */
  getDeviceId(): string | undefined {
    return this.config.deviceId;
  }

  /**
   * Generate and set a new device ID if one doesn't exist
   */
  getOrCreateDeviceId(): string {
    if (!this.config.deviceId) {
      // For web: use localStorage + crypto.randomUUID()
      // For React Native: this should be overridden with platform-specific logic
      this.config.deviceId = this.generateDeviceId();
    }
    return this.config.deviceId;
  }

  /**
   * Generate a new device ID
   */
  private generateDeviceId(): string {
    // Check if running in browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('nvlp_device_id');
      if (stored) return stored;
      
      // Generate new device ID
      const deviceId = typeof window.crypto !== 'undefined' && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : 'device-' + Date.now() + '-' + Math.random().toString(36).substring(2);
      
      window.localStorage.setItem('nvlp_device_id', deviceId);
      return deviceId;
    } else {
      // Fallback for Node.js or other environments
      return 'device-' + Date.now() + '-' + Math.random().toString(36).substring(2);
    }
  }

  /**
   * Set token provider for automatic token refresh
   */
  setTokenProvider(tokenProvider: TokenProvider): void {
    this.config.tokenProvider = tokenProvider;
  }

  /**
   * Clear token provider
   */
  clearTokenProvider(): void {
    this.config.tokenProvider = undefined;
  }

  /**
   * Get offline queue statistics
   */
  getOfflineQueueSize(): number {
    return this.offlineQueue?.getQueueSize() || 0;
  }

  /**
   * Process all queued offline requests
   */
  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue) {
      await this.offlineQueue.processQueue();
    }
  }

  /**
   * Clear the offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    if (this.offlineQueue) {
      await this.offlineQueue.clearQueue();
    }
  }

  /**
   * Check if an error is an authentication error
   */
  private isAuthError(error: any): boolean {
    if (error instanceof HttpError) {
      const isAuth = error.status === 401 || error.status === 403;
      if (isAuth) {
        console.log('🔐 HTTP Client: Detected auth error:', error.status, error.statusText);
      }
      return isAuth;
    }
    return false;
  }

  /**
   * Ensure we have a valid token, refreshing if necessary
   */
  private async ensureValidToken(): Promise<string | null> {
    if (!this.config.tokenProvider) {
      return null;
    }

    const token = await this.config.tokenProvider.getToken();
    if (!token) {
      return null;
    }

    // Check if token is expired and refresh if needed
    if (this.config.tokenProvider.isTokenExpired(token)) {
      try {
        return await this.config.tokenProvider.refreshToken();
      } catch (error) {
        console.warn('Failed to refresh token:', error);
        return null;
      }
    }

    return token;
  }

  /**
   * Execute a raw HTTP request with retry logic, automatic token refresh, and offline queue
   */
  async request<T = any>(
    path: string, 
    config: RequestConfig = {}
  ): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.config.baseUrl}${path}`;

    try {
      return await this.executeRequestInternal<T>(url, config);
    } catch (error) {
      // Check if we should queue this request for offline retry
      if (this.offlineQueue?.shouldQueue(error)) {
        await this.offlineQueue.enqueue(url, config);
        // Re-throw the error so the caller knows the request failed
        throw error;
      }
      throw error;
    }
  }

  /**
   * Internal method to execute a request (used by both online and offline queue)
   */
  private async executeRequestInternal<T = any>(
    url: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      timeout = this.config.timeout || 30000,
      retryOptions,
      body,
      headers,
      ...requestInit
    } = config;

    const finalRetryOptions = { ...this.defaultRetryOptions, ...retryOptions };
    const fetchWithTimeout = createTimeoutFetch(timeout);

    const makeRequest = async (includeToken: boolean = true): Promise<T> => {
      const finalHeaders: Record<string, string> = {
        ...this.config.defaultHeaders,
        ...headers,
      };

      // Add device ID header automatically if available
      const deviceId = this.getOrCreateDeviceId();
      if (deviceId) {
        finalHeaders['X-Device-ID'] = deviceId;
      }

      // Add token if available and requested
      if (includeToken && this.config.tokenProvider) {
        const token = await this.ensureValidToken();
        if (token) {
          finalHeaders['Authorization'] = `Bearer ${token}`;
        }
      }

      // Auto-set Content-Type for JSON bodies
      if (body && typeof body === 'object' && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json';
      }

      const response = await fetchWithTimeout(url, {
        ...requestInit,
        headers: finalHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      });

      if (!response.ok) {
        // Check for session invalidation before throwing generic error
        if (response.status === 401) {
          try {
            const errorData = await response.json() as any;
            if (errorData && errorData.code === 'SESSION_INVALIDATED') {
              // Emit event for session invalidation
              this.emit('sessionInvalidated', errorData.error || 'Session invalidated');
              throw new SessionInvalidatedError(errorData.error || 'Session invalidated');
            }
          } catch (jsonError) {
            // If we can't parse JSON, continue with normal error handling
          }
        }
        throw new HttpError(response);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || response.status === 204) {
        return undefined as T;
      }

      // Parse JSON responses
      if (contentType.includes('application/json')) {
        return response.json() as Promise<T>;
      }

      // Return text for other content types
      return response.text() as Promise<T>;
    };

    const operation = async (): Promise<T> => {
      try {
        return await makeRequest();
      } catch (error) {
        // If auth error and we have a token provider, try to refresh and retry once
        if (this.isAuthError(error) && this.config.tokenProvider) {
          console.log('🔄 HTTP Client: Got 401, attempting token refresh...');
          try {
            // Force token refresh by calling refreshToken directly
            await this.config.tokenProvider.refreshToken();
            console.log('✅ HTTP Client: Token refreshed, retrying request...');
            return await makeRequest();
          } catch (refreshError) {
            console.error('❌ HTTP Client: Token refresh failed:', refreshError);
            // If refresh fails, throw the original error
            throw error;
          }
        }
        throw error;
      }
    };

    return withRetry(operation, finalRetryOptions);
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  /**
   * GET request
   */
  async get<T = any>(path: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(path: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...config, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(path: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...config, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(path: string, body?: any, config: Omit<RequestConfig, 'method'> = {}): Promise<T> {
    return this.request<T>(path, { ...config, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(path: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }
}

/**
 * Create an HTTP client instance
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}