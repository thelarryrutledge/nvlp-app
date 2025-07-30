import { SupabaseClient, Session } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';
import { 
  createPostgRESTHeaders, 
  PostgRESTPrefer,
  extractPaginationInfo,
  validatePostgRESTHeaders 
} from './postgrest-headers';

/**
 * Configuration for PostgREST direct access
 */
export interface PostgRESTClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseClient?: SupabaseClient<Database>;
  schema?: string;
}

/**
 * Enhanced PostgREST client with proper auth header handling
 */
export class EnhancedPostgRESTClient {
  private config: PostgRESTClientConfig;
  private baseUrl: string;

  constructor(config: PostgRESTClientConfig) {
    this.config = config;
    this.baseUrl = `${config.supabaseUrl}/rest/v1`;
  }

  /**
   * Get current session from Supabase client
   */
  private async getSession(): Promise<Session | null> {
    if (!this.config.supabaseClient) {
      return null;
    }

    const { data: { session } } = await this.config.supabaseClient.auth.getSession();
    return session;
  }

  /**
   * Execute a PostgREST query with proper headers
   */
  async query<T = any>(
    table: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'HEAD';
      query?: Record<string, string>;
      body?: any;
      prefer?: string;
      range?: { from: number; to: number };
      headers?: Record<string, string>;
    } = {}
  ): Promise<{
    data: T | null;
    error: Error | null;
    count?: number;
    range?: { from: number; to: number };
  }> {
    try {
      // Get current session for auth header
      const session = await this.getSession();
      
      // Create proper headers
      const headers = createPostgRESTHeaders(
        this.config.supabaseAnonKey,
        session,
        {
          prefer: options.prefer,
          range: options.range,
          contentProfile: this.config.schema,
          acceptProfile: this.config.schema,
          customHeaders: options.headers,
        }
      );

      // Validate headers
      if (!validatePostgRESTHeaders(headers as Record<string, string>)) {
        throw new Error('Invalid PostgREST headers configuration');
      }

      // Build URL with query parameters
      const url = new URL(`${this.baseUrl}/${table}`);
      if (options.query) {
        Object.entries(options.query).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      // Execute request
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: headers as Record<string, string>,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Extract pagination info from response headers
      const paginationInfo = extractPaginationInfo(response.headers);

      // Handle response
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `PostgREST error: ${response.status} ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.details || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // Parse response
      let data: T | null = null;
      const contentType = response.headers.get('Content-Type');
      
      if (contentType?.includes('application/json')) {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } else if (contentType?.includes('text/csv')) {
        data = await response.text() as any;
      }

      return {
        data,
        error: null,
        count: paginationInfo.totalCount,
        range: paginationInfo.range,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Execute a SELECT query
   */
  async select<T = any>(
    table: string,
    options: {
      columns?: string;
      filters?: Record<string, string>;
      order?: { column: string; ascending?: boolean }[];
      limit?: number;
      offset?: number;
      count?: 'exact' | 'planned' | 'estimated';
    } = {}
  ): Promise<{ data: T[] | null; error: Error | null; count?: number }> {
    const query: Record<string, string> = {};

    // Add select columns
    if (options.columns) {
      query.select = options.columns;
    }

    // Add filters
    if (options.filters) {
      Object.assign(query, options.filters);
    }

    // Add ordering
    if (options.order && options.order.length > 0) {
      query.order = options.order
        .map(o => `${o.column}.${o.ascending !== false ? 'asc' : 'desc'}`)
        .join(',');
    }

    // Add pagination
    if (options.limit !== undefined) {
      query.limit = options.limit.toString();
    }
    if (options.offset !== undefined) {
      query.offset = options.offset.toString();
    }

    // Build prefer header
    const preferOptions: string[] = [];
    if (options.count) {
      const countMap = {
        exact: PostgRESTPrefer.COUNT_EXACT,
        planned: PostgRESTPrefer.COUNT_PLANNED,
        estimated: PostgRESTPrefer.COUNT_ESTIMATED,
      };
      preferOptions.push(countMap[options.count]);
    }

    const result = await this.query<T[]>(table, {
      method: 'GET',
      query,
      prefer: preferOptions.length > 0 ? preferOptions.join(',') : undefined,
    });

    return {
      data: result.data,
      error: result.error,
      count: result.count,
    };
  }

  /**
   * Execute an INSERT query
   */
  async insert<T = any>(
    table: string,
    data: any | any[],
    options: {
      returning?: boolean;
      onConflict?: string;
    } = {}
  ): Promise<{ data: T | T[] | null; error: Error | null }> {
    const preferOptions: string[] = [];
    
    if (options.returning !== false) {
      preferOptions.push(PostgRESTPrefer.RETURN_REPRESENTATION);
    } else {
      preferOptions.push(PostgRESTPrefer.RETURN_MINIMAL);
    }

    if (options.onConflict) {
      preferOptions.push(`resolution=${options.onConflict}`);
    }

    const result = await this.query<T | T[]>(table, {
      method: 'POST',
      body: data,
      prefer: preferOptions.join(','),
    });

    return {
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Execute an UPDATE query
   */
  async update<T = any>(
    table: string,
    data: any,
    filters: Record<string, string>,
    options: {
      returning?: boolean;
    } = {}
  ): Promise<{ data: T[] | null; error: Error | null }> {
    const prefer = options.returning !== false
      ? PostgRESTPrefer.RETURN_REPRESENTATION
      : PostgRESTPrefer.RETURN_MINIMAL;

    const result = await this.query<T[]>(table, {
      method: 'PATCH',
      query: filters,
      body: data,
      prefer,
    });

    return {
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Execute a DELETE query
   */
  async delete(
    table: string,
    filters: Record<string, string>
  ): Promise<{ error: Error | null }> {
    const result = await this.query(table, {
      method: 'DELETE',
      query: filters,
      prefer: PostgRESTPrefer.RETURN_MINIMAL,
    });

    return {
      error: result.error,
    };
  }

  /**
   * Execute a stored procedure (RPC)
   */
  async rpc<T = any>(
    functionName: string,
    params?: any,
    options: {
      get?: boolean;
      head?: boolean;
      count?: 'exact' | 'planned' | 'estimated';
    } = {}
  ): Promise<{ data: T | null; error: Error | null; count?: number }> {
    const method = options.head ? 'HEAD' : options.get ? 'GET' : 'POST';
    
    const preferOptions: string[] = [];
    if (options.count) {
      const countMap = {
        exact: PostgRESTPrefer.COUNT_EXACT,
        planned: PostgRESTPrefer.COUNT_PLANNED,
        estimated: PostgRESTPrefer.COUNT_ESTIMATED,
      };
      preferOptions.push(countMap[options.count]);
    }

    const result = await this.query<T>(`rpc/${functionName}`, {
      method,
      body: method === 'POST' ? params : undefined,
      query: method === 'GET' ? params : undefined,
      prefer: preferOptions.length > 0 ? preferOptions.join(',') : undefined,
    });

    return {
      data: result.data,
      error: result.error,
      count: result.count,
    };
  }
}

/**
 * Create an enhanced PostgREST client instance
 */
export function createEnhancedPostgRESTClient(
  config: PostgRESTClientConfig
): EnhancedPostgRESTClient {
  return new EnhancedPostgRESTClient(config);
}