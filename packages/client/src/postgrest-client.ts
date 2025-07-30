import { Database } from '@nvlp/types';

/**
 * Configuration for PostgREST client
 */
export interface PostgRESTConfig {
  /** Supabase URL */
  url: string;
  /** Supabase anonymous key */
  anonKey: string;
  /** Optional schema name (defaults to 'public') */
  schema?: string;
  /** JWT token for authentication */
  token?: string;
  /** Custom headers to include with requests */
  headers?: Record<string, string>;
}

/**
 * Query builder for PostgREST requests
 */
export class PostgRESTQueryBuilder {
  private baseUrl: string;
  private headers: Record<string, string>;
  private queryParams: URLSearchParams;

  constructor(baseUrl: string, headers: Record<string, string>) {
    this.baseUrl = baseUrl;
    this.headers = { ...headers };
    this.queryParams = new URLSearchParams();
  }

  /**
   * Select specific columns
   */
  select(columns: string = '*'): this {
    this.queryParams.set('select', columns);
    return this;
  }

  /**
   * Filter by equality
   */
  eq(column: string, value: string | number | boolean): this {
    this.queryParams.set(column, `eq.${value}`);
    return this;
  }

  /**
   * Filter by inequality
   */
  neq(column: string, value: string | number | boolean): this {
    this.queryParams.set(column, `neq.${value}`);
    return this;
  }

  /**
   * Filter by greater than
   */
  gt(column: string, value: string | number): this {
    this.queryParams.set(column, `gt.${value}`);
    return this;
  }

  /**
   * Filter by greater than or equal
   */
  gte(column: string, value: string | number): this {
    this.queryParams.set(column, `gte.${value}`);
    return this;
  }

  /**
   * Filter by less than
   */
  lt(column: string, value: string | number): this {
    this.queryParams.set(column, `lt.${value}`);
    return this;
  }

  /**
   * Filter by less than or equal
   */
  lte(column: string, value: string | number): this {
    this.queryParams.set(column, `lte.${value}`);
    return this;
  }

  /**
   * Filter by pattern matching (case sensitive)
   */
  like(column: string, pattern: string): this {
    this.queryParams.set(column, `like.${pattern}`);
    return this;
  }

  /**
   * Filter by pattern matching (case insensitive)
   */
  ilike(column: string, pattern: string): this {
    this.queryParams.set(column, `ilike.${pattern}`);
    return this;
  }

  /**
   * Filter by values in list
   */
  in(column: string, values: (string | number | boolean)[]): this {
    this.queryParams.set(column, `in.(${values.join(',')})`);
    return this;
  }

  /**
   * Filter by null value
   */
  isNull(column: string): this {
    this.queryParams.set(column, 'is.null');
    return this;
  }

  /**
   * Filter by not null value
   */
  isNotNull(column: string): this {
    this.queryParams.set(column, 'not.is.null');
    return this;
  }

  /**
   * Complex OR filter
   */
  or(filters: string): this {
    this.queryParams.set('or', `(${filters})`);
    return this;
  }

  /**
   * Complex AND filter
   */
  and(filters: string): this {
    this.queryParams.set('and', `(${filters})`);
    return this;
  }

  /**
   * Order results
   */
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

  /**
   * Limit number of results
   */
  limit(count: number): this {
    this.queryParams.set('limit', count.toString());
    return this;
  }

  /**
   * Skip number of results
   */
  offset(count: number): this {
    this.queryParams.set('offset', count.toString());
    return this;
  }

  /**
   * Set range header for pagination
   */
  range(from: number, to: number): this {
    this.headers['Range'] = `${from}-${to}`;
    return this;
  }

  /**
   * Set response format
   */
  format(type: 'json' | 'csv'): this {
    this.headers['Accept'] = type === 'csv' ? 'text/csv' : 'application/json';
    return this;
  }

  /**
   * Execute GET request
   */
  async get<T = any>(): Promise<T> {
    const url = `${this.baseUrl}?${this.queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`PostgREST request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Execute GET request and return single record
   */
  async single<T = any>(): Promise<T | null> {
    const results = await this.get<T[]>();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute POST request (insert)
   */
  async post<T = any>(data: any): Promise<T> {
    const url = this.baseUrl;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.headers,
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

  /**
   * Execute PATCH request (update)
   */
  async patch<T = any>(data: any): Promise<T> {
    const url = `${this.baseUrl}?${this.queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...this.headers,
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

  /**
   * Execute DELETE request
   */
  async delete(): Promise<void> {
    const url = `${this.baseUrl}?${this.queryParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`PostgREST delete failed: ${response.status} ${response.statusText}`);
    }
  }
}

/**
 * PostgREST client for direct database access
 */
export class PostgRESTClient {
  private config: PostgRESTConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: PostgRESTConfig) {
    this.config = config;
    this.baseHeaders = {
      'apikey': config.anonKey,
      'Content-Profile': config.schema || 'public',
      'Accept-Profile': config.schema || 'public',
      ...config.headers,
    };

    if (config.token) {
      this.baseHeaders['Authorization'] = `Bearer ${config.token}`;
    }
  }

  /**
   * Update the JWT token
   */
  setToken(token: string): void {
    this.config.token = token;
    this.baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear the JWT token
   */
  clearToken(): void {
    this.config.token = undefined;
    delete this.baseHeaders['Authorization'];
  }

  /**
   * Get the base URL for PostgREST
   */
  private getBaseUrl(): string {
    return `${this.config.url}/rest/v1`;
  }

  /**
   * Create a query builder for a table
   */
  from(table: string): PostgRESTQueryBuilder {
    const url = `${this.getBaseUrl()}/${table}`;
    return new PostgRESTQueryBuilder(url, this.baseHeaders);
  }

  /**
   * Execute a raw PostgREST request
   */
  async raw(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.getBaseUrl()}${path}`;
    
    return fetch(url, {
      ...options,
      headers: {
        ...this.baseHeaders,
        ...options.headers,
      },
    });
  }

  // Table-specific methods for type safety

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
}

/**
 * Create a PostgREST client instance
 */
export function createPostgRESTClient(config: PostgRESTConfig): PostgRESTClient {
  return new PostgRESTClient(config);
}

// Type-safe table names
export type TableName = keyof Database['public']['Tables'];

// Re-export types for convenience  
export type { Database };