/**
 * PostgREST Transport Implementation
 *
 * Direct PostgREST API calls for CRUD operations
 */

import { NetworkError, TimeoutError, createErrorFromResponse } from '../errors';
import { ApiResponse, NVLPClientConfig, RequestOptions, Transport } from '../types';

export class PostgRESTTransport implements Transport {
  private baseUrl: string;
  private anonKey: string;
  private timeout: number;
  private accessToken: string | null = null;

  constructor(config: NVLPClientConfig) {
    // Use custom DB API URL if provided, otherwise fall back to Supabase URL
    this.baseUrl = config.dbApiUrl || `${config.supabaseUrl}/rest/v1`;
    this.anonKey = config.supabaseAnonKey;
    this.timeout = config.timeout || 30000; // 30 second default
  }

  /**
   * Set authentication token
   */
  setAuth(accessToken: string | null): void {
    this.accessToken = accessToken;
  }

  /**
   * Make HTTP request to PostgREST API
   */
  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
    const timeout = options?.timeout || this.timeout;

    // Build headers
    const headers: Record<string, string> = {
      apikey: this.anonKey,
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Add authentication if available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Add return representation header for POST/PATCH
    if (method === 'POST' || method === 'PATCH') {
      headers['Prefer'] = 'return=representation';
    }

    // Setup abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body
      let responseData: any;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        throw createErrorFromResponse(response.status, responseData);
      }

      // Handle success response
      return {
        data: responseData,
        error: null,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(`Request timeout after ${timeout}ms`);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Network request failed');
      }

      // Re-throw existing NVLP errors
      throw error;
    }
  }

  /**
   * Build query string from params
   */
  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * GET request with query parameters
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request('GET', `${endpoint}${queryString}`, undefined, options);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request('POST', endpoint, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request('PATCH', endpoint, data, options);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request('DELETE', endpoint, undefined, options);
  }

  /**
   * Helper method for PostgREST filtering
   */
  buildPostgRESTEndpoint(table: string, filters?: Record<string, any>): string {
    if (!filters || Object.keys(filters).length === 0) {
      return table;
    }

    const queryString = this.buildQueryString(filters);
    return `${table}${queryString}`;
  }
}
