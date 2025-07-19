/**
 * API Error Handling
 * 
 * Centralized error handling for API operations with user-friendly messages
 */

import { Alert } from 'react-native';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  originalError?: any;
  statusCode?: number;
  details?: any;
}

/**
 * Transform raw errors into structured ApiError objects
 */
export function transformError(error: any): ApiError {
  // Handle NVLP client library errors first
  if (error.name === 'NVLPError' || error.constructor?.name === 'NVLPError') {
    // Log the full error for debugging
    console.error('NVLPError details:', {
      name: error.name,
      code: error.code,
      message: error.message,
      status: error.status,
      originalError: error.originalError,
    });
    
    switch (error.code) {
      case 'AUTHENTICATION_ERROR':
        return {
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication failed. Please check your credentials and try again.',
          originalError: error,
          statusCode: error.status || 401,
        };
      case 'AUTHORIZATION_ERROR':
        return {
          type: ErrorType.AUTHORIZATION,
          message: 'You do not have permission to perform this action.',
          originalError: error,
          statusCode: error.status || 403,
        };
      case 'VALIDATION_ERROR':
        return {
          type: ErrorType.VALIDATION,
          message: error.message || 'Invalid data provided.',
          originalError: error,
          statusCode: error.status || 422,
        };
      case 'NETWORK_ERROR':
        return {
          type: ErrorType.NETWORK,
          message: 'Network connection failed. Please check your internet connection.',
          originalError: error,
        };
      case 'TIMEOUT_ERROR':
        return {
          type: ErrorType.NETWORK,
          message: 'Request timed out. Please try again.',
          originalError: error,
        };
      default:
        return {
          type: ErrorType.UNKNOWN,
          message: error.message || 'An unexpected error occurred.',
          originalError: error,
          statusCode: error.status,
        };
    }
  }

  // Handle network errors (only if no response and specific network codes)
  if (!error.response && error.code && (
    error.code === 'NETWORK_ERROR' || 
    error.code === 'ECONNREFUSED' || 
    error.code === 'ENOTFOUND' ||
    error.code === 'TIMEOUT'
  )) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network connection failed. Please check your internet connection.',
      originalError: error,
    };
  }

  // Handle HTTP response errors
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        return {
          type: ErrorType.AUTHENTICATION,
          message: 'Authentication failed. Please log in again.',
          statusCode: status,
          originalError: error,
        };
      
      case 403:
        return {
          type: ErrorType.AUTHORIZATION,
          message: 'You do not have permission to perform this action.',
          statusCode: status,
          originalError: error,
        };
      
      case 404:
        return {
          type: ErrorType.NOT_FOUND,
          message: 'The requested resource was not found.',
          statusCode: status,
          originalError: error,
        };
      
      case 422:
        return {
          type: ErrorType.VALIDATION,
          message: data?.message || 'Invalid data provided.',
          statusCode: status,
          details: data?.details,
          originalError: error,
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: ErrorType.SERVER,
          message: 'Server error occurred. Please try again later.',
          statusCode: status,
          originalError: error,
        };
      
      default:
        return {
          type: ErrorType.UNKNOWN,
          message: data?.message || 'An unexpected error occurred.',
          statusCode: status,
          originalError: error,
        };
    }
  }

  // Handle NVLP client library errors
  if (error.name === 'AuthenticationError') {
    return {
      type: ErrorType.AUTHENTICATION,
      message: 'Authentication required. Please log in.',
      originalError: error,
    };
  }

  // Handle other known error types
  if (error.message) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
    };
  }

  // Fallback for unknown errors
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred.',
    originalError: error,
  };
}

/**
 * Show error to user with appropriate UI
 */
export function showError(error: ApiError, options?: { 
  title?: string; 
  showDetails?: boolean;
  onRetry?: () => void;
}) {
  const title = options?.title || getErrorTitle(error.type);
  const message = error.message;
  
  const buttons: any[] = [{ text: 'OK', style: 'default' }];
  
  if (options?.onRetry) {
    buttons.unshift({ text: 'Retry', onPress: options.onRetry });
  }
  
  if (options?.showDetails && error.details) {
    Alert.alert(title, `${message}\n\nDetails: ${JSON.stringify(error.details)}`, buttons);
  } else {
    Alert.alert(title, message, buttons);
  }
}

/**
 * Get user-friendly title for error type
 */
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Connection Error';
    case ErrorType.AUTHENTICATION:
      return 'Authentication Required';
    case ErrorType.AUTHORIZATION:
      return 'Permission Denied';
    case ErrorType.VALIDATION:
      return 'Invalid Data';
    case ErrorType.NOT_FOUND:
      return 'Not Found';
    case ErrorType.SERVER:
      return 'Server Error';
    default:
      return 'Error';
  }
}

/**
 * Log error for debugging
 */
export function logError(error: ApiError, context?: string) {
  const prefix = context ? `[${context}]` : '[API]';
  console.error(`${prefix} ${error.type}:`, error.message);
  
  if (error.originalError) {
    console.error(`${prefix} Original error:`, error.originalError);
  }
  
  if (error.details) {
    console.error(`${prefix} Details:`, error.details);
  }
}