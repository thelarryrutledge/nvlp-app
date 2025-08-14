/**
 * Unified NVLP client that combines HTTP, PostgREST, and authentication
 */

import { Session } from '@supabase/supabase-js';
import { HttpClient, HttpClientConfig, TokenProvider, HttpError, OfflineQueueConfig } from './http-client';
import { DeviceService } from './services/device.service';

/**
 * Authenticated PostgREST query builder that works with the unified client
 */
class AuthenticatedPostgRESTQueryBuilder {
  private baseUrl: string;
  private client: NVLPClient;
  private queryParams: URLSearchParams;
  private customHeaders: Record<string, string> = {};

  constructor(baseUrl: string, client: NVLPClient) {
    this.baseUrl = baseUrl;
    this.client = client;
    this.queryParams = new URLSearchParams();
  }

  // Query building methods (same as PostgRESTQueryBuilder)

  select(columns: string = '*'): this {
    this.queryParams.set('select', columns);
    return this;
  }

  eq(column: string, value: string | number | boolean): this {
    this.queryParams.set(column, `eq.${value}`);
    return this;
  }

  neq(column: string, value: string | number | boolean): this {
    this.queryParams.set(column, `neq.${value}`);
    return this;
  }

  gt(column: string, value: string | number): this {
    this.queryParams.set(column, `gt.${value}`);
    return this;
  }

  gte(column: string, value: string | number): this {
    this.queryParams.set(column, `gte.${value}`);
    return this;
  }

  lt(column: string, value: string | number): this {
    this.queryParams.set(column, `lt.${value}`);
    return this;
  }

  lte(column: string, value: string | number): this {
    this.queryParams.set(column, `lte.${value}`);
    return this;
  }

  like(column: string, pattern: string): this {
    this.queryParams.set(column, `like.${pattern}`);
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.queryParams.set(column, `ilike.${pattern}`);
    return this;
  }

  in(column: string, values: (string | number | boolean)[]): this {
    this.queryParams.set(column, `in.(${values.join(',')})`);
    return this;
  }

  isNull(column: string): this {
    this.queryParams.set(column, 'is.null');
    return this;
  }

  isNotNull(column: string): this {
    this.queryParams.set(column, 'not.is.null');
    return this;
  }

  or(filters: string): this {
    this.queryParams.set('or', `(${filters})`);
    return this;
  }

  and(filters: string): this {
    this.queryParams.set('and', `(${filters})`);
    return this;
  }

  order(column: string, ascending: boolean = true): this {
    const direction = ascending ? 'asc' : 'desc';
    const existing = this.queryParams.get('order');
    const newOrder = `${column}.${direction}`;
    
    if (existing) {
      this.queryParams.set('order', `${existing},${newOrder}`);
    } else {
      this.queryParams.set('order', newOrder);
    }
    return this;
  }

  limit(count: number): this {
    this.queryParams.set('limit', count.toString());
    return this;
  }

  offset(count: number): this {
    this.queryParams.set('offset', count.toString());
    return this;
  }

  range(from: number, to: number): this {
    this.customHeaders['Range'] = `${from}-${to}`;
    return this;
  }

  format(type: 'json' | 'csv'): this {
    this.customHeaders['Accept'] = type === 'csv' ? 'text/csv' : 'application/json';
    return this;
  }

  // Execution methods with authentication

  async get<T = any>(): Promise<T> {
    const url = `${this.baseUrl}?${this.queryParams.toString()}`;
    const headers = await this.client.getPostgRESTHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...headers, ...this.customHeaders },
    });

    if (!response.ok) {
      throw new Error(`PostgREST request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async single<T = any>(): Promise<T | null> {
    const results = await this.get<T[]>();
    return results.length > 0 ? results[0] : null;
  }

  async post<T = any>(data: any): Promise<T> {
    const headers = await this.client.getPostgRESTHeaders();
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        ...headers,
        ...this.customHeaders,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`PostgREST insert failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async patch<T = any>(data: any): Promise<T> {
    const url = `${this.baseUrl}?${this.queryParams.toString()}`;
    const headers = await this.client.getPostgRESTHeaders();
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        ...this.customHeaders,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`PostgREST update failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async delete(): Promise<void> {
    const url = `${this.baseUrl}?${this.queryParams.toString()}`;
    const headers = await this.client.getPostgRESTHeaders();
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { ...headers, ...this.customHeaders },
    });

    if (!response.ok) {
      throw new Error(`PostgREST delete failed: ${response.status} ${response.statusText}`);
    }
  }
}

/**
 * Configuration for the unified NVLP client
 */
export interface NVLPClientConfig {
  /** Supabase URL */
  supabaseUrl: string;
  /** Supabase anonymous key */
  supabaseAnonKey: string;
  /** Custom domain URL (overrides supabaseUrl for Edge Functions) */
  customDomain?: string;
  /** Default schema (defaults to 'public') */
  schema?: string;
  /** Additional headers to include with all requests */
  headers?: Record<string, string>;
  /** HTTP client timeout in milliseconds */
  timeout?: number;
  /** Session provider for authentication */
  sessionProvider?: SessionProvider;
  /** Offline queue configuration */
  offlineQueue?: OfflineQueueConfig;
}

/**
 * Session provider interface for authentication
 */
export interface SessionProvider {
  getSession(): Promise<Session | null>;
  ensureValidSession(): Promise<Session>;
  onSessionChange(handler: (session: Session | null) => void): () => void;
}

/**
 * Token provider implementation using Supabase sessions
 */
class SupabaseTokenProvider implements TokenProvider {
  private sessionProvider: SessionProvider;

  constructor(sessionProvider: SessionProvider) {
    this.sessionProvider = sessionProvider;
  }

  async getToken(): Promise<string | null> {
    const session = await this.sessionProvider.getSession();
    return session?.access_token || null;
  }

  async refreshToken(): Promise<string> {
    const session = await this.sessionProvider.ensureValidSession();
    if (!session?.access_token) {
      throw new Error('Failed to refresh token: No session available');
    }
    return session.access_token;
  }

  isTokenExpired(token: string): boolean {
    // Decode JWT to check expiry
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const bufferMs = 5 * 60 * 1000; // 5 minute buffer
      return Date.now() > (expiryTime - bufferMs);
    } catch {
      // If we can't decode, assume it's not expired (let server handle it)
      return false;
    }
  }
}

/**
 * Unified NVLP client that provides both HTTP and PostgREST functionality
 */
export class NVLPClient {
  private config: NVLPClientConfig;
  private httpClient: HttpClient;
  private sessionProvider?: SessionProvider;
  private unsubscribeFromSession?: () => void;

  // Services
  public readonly device: DeviceService;

  constructor(config: NVLPClientConfig) {
    this.config = config;
    this.sessionProvider = config.sessionProvider;

    // Create HTTP client configuration
    const httpConfig: HttpClientConfig = {
      baseUrl: config.customDomain || config.supabaseUrl,
      timeout: config.timeout || 30000,
      defaultHeaders: {
        'User-Agent': 'NVLP-Client/1.0.0',
        ...config.headers,
      },
      offlineQueue: config.offlineQueue,
    };

    // Add token provider if session provider is available
    if (this.sessionProvider) {
      httpConfig.tokenProvider = new SupabaseTokenProvider(this.sessionProvider);
    }

    this.httpClient = new HttpClient(httpConfig);

    // Initialize services
    this.device = new DeviceService(this.httpClient);

    // Set up session change listener for PostgREST calls
    if (this.sessionProvider) {
      this.unsubscribeFromSession = this.sessionProvider.onSessionChange(
        () => {
          // Session changes are automatically handled by the token provider
          // No additional action needed here
        }
      );
    }
  }

  /**
   * Set session provider after client creation
   */
  setSessionProvider(sessionProvider: SessionProvider): void {
    this.sessionProvider = sessionProvider;
    const tokenProvider = new SupabaseTokenProvider(sessionProvider);
    this.httpClient.setTokenProvider(tokenProvider);

    // Set up session change listener
    if (this.unsubscribeFromSession) {
      this.unsubscribeFromSession();
    }
    this.unsubscribeFromSession = sessionProvider.onSessionChange(() => {
      // Session changes handled automatically by token provider
    });
  }

  /**
   * Clear session provider (for logout)
   */
  clearSessionProvider(): void {
    this.sessionProvider = undefined;
    this.httpClient.clearTokenProvider();

    if (this.unsubscribeFromSession) {
      this.unsubscribeFromSession();
      this.unsubscribeFromSession = undefined;
    }
  }

  // HTTP API Methods (for Edge Functions)

  /**
   * GET request to Edge Functions API
   */
  async get<T = any>(path: string, config?: any): Promise<T> {
    return this.httpClient.get<T>(this.getEdgeFunctionPath(path), config);
  }

  /**
   * POST request to Edge Functions API
   */
  async post<T = any>(path: string, body?: any, config?: any): Promise<T> {
    return this.httpClient.post<T>(this.getEdgeFunctionPath(path), body, config);
  }

  /**
   * PUT request to Edge Functions API
   */
  async put<T = any>(path: string, body?: any, config?: any): Promise<T> {
    return this.httpClient.put<T>(this.getEdgeFunctionPath(path), body, config);
  }

  /**
   * PATCH request to Edge Functions API
   */
  async patch<T = any>(path: string, body?: any, config?: any): Promise<T> {
    return this.httpClient.patch<T>(this.getEdgeFunctionPath(path), body, config);
  }

  /**
   * DELETE request to Edge Functions API
   */
  async delete<T = any>(path: string, config?: any): Promise<T> {
    return this.httpClient.delete<T>(this.getEdgeFunctionPath(path), config);
  }

  // PostgREST Query Builder Methods

  /**
   * Create a PostgREST query builder for a table
   */
  from(table: string): AuthenticatedPostgRESTQueryBuilder {
    const url = `${this.getPostgRESTBaseUrl()}/${table}`;
    return new AuthenticatedPostgRESTQueryBuilder(url, this);
  }

  // Convenience methods for common tables

  /**
   * User profiles table
   */
  get userProfiles() {
    return this.from('user_profiles');
  }

  /**
   * Budgets table
   */
  get budgets() {
    return this.from('budgets');
  }

  /**
   * Categories table
   */
  get categories() {
    return this.from('categories');
  }

  /**
   * Income sources table
   */
  get incomeSources() {
    return this.from('income_sources');
  }

  /**
   * Payees table
   */
  get payees() {
    return this.from('payees');
  }

  /**
   * Envelopes table
   */
  get envelopes() {
    return this.from('envelopes');
  }

  /**
   * Transactions table
   */
  get transactions() {
    return this.from('transactions');
  }

  /**
   * Transaction events table (audit log)
   */
  get transactionEvents() {
    return this.from('transaction_events');
  }

  // Private helper methods

  private getPostgRESTBaseUrl(): string {
    return `${this.config.supabaseUrl}/rest/v1`;
  }

  private getEdgeFunctionPath(path: string): string {
    // If path starts with /functions/, use it as-is, otherwise prepend it
    if (path.startsWith('/functions/')) {
      return path;
    }
    return `/functions/v1/${path.startsWith('/') ? path.slice(1) : path}`;
  }

  async getPostgRESTHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'apikey': this.config.supabaseAnonKey,
      'Content-Profile': this.config.schema || 'public',
      'Accept-Profile': this.config.schema || 'public',
      'User-Agent': 'NVLP-Client/1.0.0',
      ...this.config.headers,
    };

    // Add authorization header if we have a session
    if (this.sessionProvider) {
      try {
        const session = await this.sessionProvider.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        // Ignore session errors for PostgREST headers
        console.warn('Failed to get session for PostgREST headers:', error);
      }
    }

    return headers;
  }

  /**
   * Execute an authenticated PostgREST operation with automatic token refresh
   */
  async withAuth<T>(operation: (client: NVLPClient) => Promise<T>): Promise<T> {
    if (!this.sessionProvider) {
      throw new Error('Session provider is required for authenticated operations');
    }

    try {
      // Ensure we have a valid session before making the request
      await this.sessionProvider.ensureValidSession();
      return await operation(this);
    } catch (error) {
      // If the request fails due to auth, try to refresh and retry once
      if (this.isAuthError(error)) {
        try {
          await this.sessionProvider.ensureValidSession();
          return await operation(this);
        } catch (retryError) {
          throw retryError;
        }
      }
      throw error;
    }
  }

  private isAuthError(error: any): boolean {
    if (error instanceof HttpError) {
      return error.status === 401 || error.status === 403;
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('401') || 
             message.includes('unauthorized') || 
             message.includes('forbidden') ||
             message.includes('403');
    }
    return false;
  }

  // Offline Queue Management

  /**
   * Get the number of requests in the offline queue
   */
  getOfflineQueueSize(): number {
    return this.httpClient.getOfflineQueueSize();
  }

  /**
   * Process all queued offline requests
   */
  async processOfflineQueue(): Promise<void> {
    await this.httpClient.processOfflineQueue();
  }

  /**
   * Clear the offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    await this.httpClient.clearOfflineQueue();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.unsubscribeFromSession) {
      this.unsubscribeFromSession();
      this.unsubscribeFromSession = undefined;
    }
  }
}

/**
 * Create a unified NVLP client
 */
export function createNVLPClient(config: NVLPClientConfig): NVLPClient {
  return new NVLPClient(config);
}

/**
 * Create NVLP client from environment variables
 */
export function createNVLPClientFromEnv(overrides: Partial<NVLPClientConfig> = {}): NVLPClient {
  const supabaseUrl = overrides.supabaseUrl || process.env.SUPABASE_URL;
  const supabaseAnonKey = overrides.supabaseAnonKey || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable or supabaseUrl config is required');
  }

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable or supabaseAnonKey config is required');
  }

  return createNVLPClient({
    supabaseUrl,
    supabaseAnonKey,
    ...overrides,
  });
}