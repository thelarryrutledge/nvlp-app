/**
 * API response types and error handling
 */

// Standard API response format
export interface ApiResponse<T> {
  data: T;
  error: null;
  status: number;
} 

export interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
}

// Request options
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: boolean;
}