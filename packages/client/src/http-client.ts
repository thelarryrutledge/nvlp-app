/**
 * Base HTTP client with retry logic for NVLP API
 */

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

export interface HttpClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retryOptions?: RetryOptions;
  tokenProvider?: TokenProvider;
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

  constructor(config: HttpClientConfig) {
    this.config = config;
    this.defaultRetryOptions = config.retryOptions || {
      maxAttempts: 3,
      delay: 1000,
      backoff: 'exponential',
    };
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
   * Check if an error is an authentication error
   */
  private isAuthError(error: any): boolean {
    if (error instanceof HttpError) {
      return error.status === 401 || error.status === 403;
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
   * Execute a raw HTTP request with retry logic and automatic token refresh
   */
  async request<T = any>(
    path: string, 
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
    const url = path.startsWith('http') ? path : `${this.config.baseUrl}${path}`;

    const fetchWithTimeout = createTimeoutFetch(timeout);

    const makeRequest = async (includeToken: boolean = true): Promise<T> => {
      const finalHeaders: Record<string, string> = {
        ...this.config.defaultHeaders,
        ...headers,
      };

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
          try {
            // Force token refresh by calling refreshToken directly
            await this.config.tokenProvider.refreshToken();
            return await makeRequest();
          } catch (refreshError) {
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