import { SupabaseClient } from '@supabase/supabase-js';
import { Database, ApiError, ErrorCode } from '@nvlp/types';

export abstract class BaseService {
  protected client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  protected async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await this.client.auth.getUser();
    
    if (error || !user) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        'User not authenticated',
        error
      );
    }

    return user.id;
  }

  protected async withTokenRefresh<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Check if error is due to expired token
      if (
        error?.status === 401 || 
        error?.code === 'PGRST301' ||
        error?.message?.toLowerCase().includes('jwt expired') ||
        error?.message?.toLowerCase().includes('invalid token')
      ) {
        // Try to refresh the session
        const { data, error: refreshError } = await this.client.auth.refreshSession();
        
        if (refreshError || !data.session) {
          throw new ApiError(
            ErrorCode.UNAUTHORIZED,
            'Session expired and could not be refreshed',
            refreshError
          );
        }

        // Retry the operation with the new token
        return await operation();
      }
      
      throw error;
    }
  }

  protected handleError(error: any): never {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error?.code === 'PGRST116') {
      throw new ApiError(ErrorCode.NOT_FOUND, 'Resource not found');
    }

    if (error?.code === '23505') {
      throw new ApiError(ErrorCode.ALREADY_EXISTS, 'Resource already exists');
    }

    if (error?.code === '23503') {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid reference');
    }

    if (error?.code === '23514') {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Check constraint violation');
    }

    throw new ApiError(
      ErrorCode.DATABASE_ERROR,
      error?.message || 'An unexpected error occurred',
      error
    );
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Wrap operation with token refresh handling
        return await this.withTokenRefresh(operation);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (
          error instanceof ApiError && 
          [ErrorCode.NOT_FOUND, ErrorCode.VALIDATION_ERROR, ErrorCode.INVALID_REQUEST].includes(error.code)
        ) {
          throw error;
        }
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }

    throw lastError;
  }
}