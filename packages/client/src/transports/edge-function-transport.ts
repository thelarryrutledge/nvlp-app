/**
 * Edge Function Transport Implementation
 *
 * Supabase Edge Function calls for complex operations
 */

import { NetworkError, TimeoutError, createErrorFromResponse } from '../errors';
import { ApiResponse, NVLPClientConfig, RequestOptions, Transport } from '../types';

export class EdgeFunctionTransport implements Transport {
  private baseUrl: string;
  private anonKey: string;
  private timeout: number;
  private accessToken: string | null = null;

  constructor(config: NVLPClientConfig) {
    // Use custom API base URL if provided, otherwise use supabase functions URL
    this.baseUrl = config.apiBaseUrl || `${config.supabaseUrl}/functions/v1`;
    this.anonKey = config.supabaseAnonKey;
    this.timeout = config.timeout || 60000; // 60 second default for complex operations
  }

  /**
   * Set authentication token
   */
  setAuth(accessToken: string | null): void {
    this.accessToken = accessToken;
  }

  /**
   * Make HTTP request to Edge Function
   */
  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const functionName = endpoint.replace(/^\//, '');
    const url = `${this.baseUrl}/${functionName}`;
    const timeout = options?.timeout || this.timeout;

    // Build headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.anonKey}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Add user authentication if available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
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

      // Edge Functions return data in consistent format
      return {
        data: responseData,
        error: null,
        status: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // Check for abort error (works in both browser and React Native)
      if ((error as any)?.name === 'AbortError' || (error as any)?.message?.includes('aborted')) {
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
   * Call authentication Edge Function
   */
  async auth(action: string, data: any, options?: RequestOptions): Promise<ApiResponse<any>> {
    // Map actions to actual auth endpoints
    const endpointMap: Record<string, string> = {
      login: 'auth/login',
      logout: 'auth/logout',
      refresh: 'auth/refresh',
      register: 'auth/register',
      reset: 'auth/reset-password',
      'update-password': 'auth/update-password',
      profile: 'auth/profile',
    };

    const endpoint = endpointMap[action];
    if (!endpoint) {
      throw new Error(`Unknown auth action: ${action}`);
    }

    // For profile endpoint, use GET method
    const method = action === 'profile' ? 'GET' : 'POST';
    return this.request(method, endpoint, method === 'GET' ? undefined : data, options);
  }

  /**
   * Call transaction Edge Function (future)
   */
  async transaction(
    action: string,
    data: any,
    options?: RequestOptions
  ): Promise<ApiResponse<any>> {
    return this.request('POST', 'transactions', { action, ...data }, options);
  }

  /**
   * Call reporting Edge Function (future)
   */
  async reports(
    reportType: string,
    data: any,
    options?: RequestOptions
  ): Promise<ApiResponse<any>> {
    return this.request('POST', 'reports', { reportType, ...data }, options);
  }

  /**
   * Generic Edge Function call
   */
  async callFunction<T>(
    functionName: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request('POST', functionName, data, options);
  }
}
