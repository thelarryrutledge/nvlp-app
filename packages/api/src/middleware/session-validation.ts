import { SupabaseClient } from '@supabase/supabase-js';
import { Database, ApiError, ErrorCode } from '@nvlp/types';

export interface SessionValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
  userId?: string;
}

/**
 * Session validation middleware that checks:
 * 1. Device ID header is present
 * 2. User is authenticated via Supabase
 * 3. Session hasn't been invalidated for the device
 */
export const sessionValidationMiddleware = async (
  supabaseClient: SupabaseClient<Database>,
  headers: Record<string, string>
): Promise<SessionValidationResult> => {
  try {
    // Check for required device ID header
    const deviceId = headers['x-device-id'] || headers['X-Device-ID'];
    
    if (!deviceId) {
      return { 
        isValid: false, 
        error: 'Device ID header (X-Device-ID) is required',
        code: 'MISSING_DEVICE_ID'
      };
    }
    
    // Use Supabase's built-in JWT verification (handles asymmetric keys automatically)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return { 
        isValid: false, 
        error: 'Invalid or expired authentication token',
        code: 'INVALID_AUTH'
      };
    }
    
    // Check if the session has been invalidated using our database function
    const { data: isInvalidated, error: invalidationError } = await supabaseClient.rpc(
      'is_session_invalidated',
      { 
        p_user_id: user.id, 
        p_device_id: deviceId 
      }
    );
    
    if (invalidationError) {
      console.error('Session validation database error:', invalidationError);
      return { 
        isValid: false, 
        error: 'Session validation failed due to database error',
        code: 'VALIDATION_ERROR'
      };
    }
    
    if (isInvalidated) {
      return { 
        isValid: false, 
        error: 'Session has been invalidated. Please sign in again.',
        code: 'SESSION_INVALIDATED'
      };
    }
    
    // Session is valid
    return { 
      isValid: true, 
      userId: user.id 
    };
    
  } catch (error: any) {
    console.error('Session validation middleware error:', error);
    return { 
      isValid: false, 
      error: 'Session validation failed',
      code: 'VALIDATION_ERROR'
    };
  }
};

/**
 * Express-style middleware wrapper for session validation
 * Can be used in Edge Functions or API routes
 */
export const createSessionValidationHandler = (supabaseClient: SupabaseClient<Database>) => {
  return async (headers: Record<string, string>) => {
    const result = await sessionValidationMiddleware(supabaseClient, headers);
    
    if (!result.isValid) {
      // Map validation errors to appropriate HTTP status codes
      let statusCode = 401; // Default to unauthorized
      
      switch (result.code) {
        case 'MISSING_DEVICE_ID':
          statusCode = 400; // Bad request
          break;
        case 'INVALID_AUTH':
          statusCode = 401; // Unauthorized
          break;
        case 'SESSION_INVALIDATED':
          statusCode = 401; // Unauthorized (but with specific code)
          break;
        case 'VALIDATION_ERROR':
          statusCode = 500; // Internal server error
          break;
      }
      
      throw new ApiError(
        result.code as ErrorCode || ErrorCode.UNAUTHORIZED,
        result.error || 'Session validation failed'
      );
    }
    
    return result;
  };
};

/**
 * Helper function to extract headers from Request object (for Edge Functions)
 */
export const extractRequestHeaders = (request: Request): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  // Extract commonly needed headers for session validation
  const headersToExtract = [
    'authorization',
    'x-device-id',
    'X-Device-ID',
    'user-agent',
    'x-forwarded-for'
  ];
  
  headersToExtract.forEach(headerName => {
    const value = request.headers.get(headerName);
    if (value) {
      headers[headerName.toLowerCase()] = value;
    }
  });
  
  return headers;
};

/**
 * Type guard to check if an error is a session validation error
 */
export const isSessionValidationError = (error: any): error is ApiError => {
  return error instanceof ApiError && 
    ['MISSING_DEVICE_ID', 'INVALID_AUTH', 'SESSION_INVALIDATED', 'VALIDATION_ERROR'].includes(error.code);
};