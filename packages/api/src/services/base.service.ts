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
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }

    throw lastError;
  }
}