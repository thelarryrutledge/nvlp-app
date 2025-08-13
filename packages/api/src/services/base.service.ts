import { SupabaseClient } from '@supabase/supabase-js';
import { Database, ApiError, ErrorCode } from '@nvlp/types';
import { sessionValidationMiddleware, SessionValidationResult } from '../middleware/session-validation';

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

  /**
   * Validate session with device ID checking
   * Use this for operations that require device-aware authentication
   */
  protected async validateSession(headers: Record<string, string>): Promise<SessionValidationResult> {
    const result = await sessionValidationMiddleware(this.client, headers);
    
    if (!result.isValid) {
      // Map specific validation errors to appropriate ApiError codes
      let errorCode: ErrorCode;
      
      switch (result.code) {
        case 'MISSING_DEVICE_ID':
          errorCode = ErrorCode.MISSING_DEVICE_ID;
          break;
        case 'INVALID_AUTH':
          errorCode = ErrorCode.INVALID_AUTH;
          break;
        case 'SESSION_INVALIDATED':
          errorCode = ErrorCode.SESSION_INVALIDATED;
          break;
        case 'VALIDATION_ERROR':
          errorCode = ErrorCode.VALIDATION_ERROR;
          break;
        default:
          errorCode = ErrorCode.UNAUTHORIZED;
      }
      
      throw new ApiError(errorCode, result.error || 'Session validation failed');
    }
    
    return result;
  }

  /**
   * Enhanced getCurrentUserId that includes session validation
   * Use this for device-aware operations
   */
  protected async getCurrentUserIdWithValidation(headers: Record<string, string>): Promise<string> {
    const validation = await this.validateSession(headers);
    return validation.userId!;
  }

  /**
   * Wrapper for operations that require session validation
   * Automatically validates session and passes user ID to the operation
   */
  protected async withSessionValidation<T>(
    headers: Record<string, string>,
    operation: (userId: string) => Promise<T>
  ): Promise<T> {
    const validation = await this.validateSession(headers);
    return await operation(validation.userId!);
  }

  protected async withTokenRefresh<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Check if error is due to expired or invalid token
      const isTokenError = 
        error?.status === 401 || 
        error?.code === 'PGRST301' ||
        error?.code === 'PGRST401' ||
        error?.message?.toLowerCase().includes('jwt expired') ||
        error?.message?.toLowerCase().includes('invalid token') ||
        error?.message?.toLowerCase().includes('malformed') ||
        error?.message?.toLowerCase().includes('unauthorized');
      
      if (isTokenError) {
        // Try to refresh the session
        const { data, error: refreshError } = await this.client.auth.refreshSession();
        
        if (refreshError || !data.session) {
          // Check if it's a network error
          if (refreshError?.message?.includes('network') || refreshError?.message?.includes('fetch')) {
            throw new ApiError(
              ErrorCode.SERVICE_UNAVAILABLE,
              'Unable to refresh token due to network error',
              refreshError
            );
          }
          
          throw new ApiError(
            ErrorCode.TOKEN_EXPIRED,
            'Session expired and could not be refreshed',
            refreshError
          );
        }

        // Retry the operation with the new token
        try {
          return await operation();
        } catch (retryError: any) {
          // If it still fails with auth error, the refresh didn't help
          if (retryError?.status === 401) {
            throw new ApiError(
              ErrorCode.UNAUTHORIZED,
              'Authentication failed after token refresh',
              retryError
            );
          }
          throw retryError;
        }
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
          [
            ErrorCode.NOT_FOUND, 
            ErrorCode.VALIDATION_ERROR, 
            ErrorCode.INVALID_REQUEST,
            ErrorCode.SESSION_INVALIDATED,
            ErrorCode.MISSING_DEVICE_ID,
            ErrorCode.INVALID_AUTH
          ].includes(error.code)
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