/**
 * Error handling for NVLP client library
 */

export class NVLPError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;

  constructor(message: string, code: string, status: number, details?: any) {
    super(message);
    this.name = 'NVLPError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class AuthenticationError extends NVLPError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends NVLPError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class ValidationError extends NVLPError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class ConflictError extends NVLPError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT_ERROR', 409, details);
  }
}

export class NotFoundError extends NVLPError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND_ERROR', 404);
  }
}

export class NetworkError extends NVLPError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 0);
  }
}

export class TimeoutError extends NVLPError {
  constructor(message: string = 'Request timeout') {
    super(message, 'TIMEOUT_ERROR', 408);
  }
}

export class ServerError extends NVLPError {
  constructor(message: string = 'Internal server error', status: number = 500) {
    super(message, 'SERVER_ERROR', status);
  }
}

/**
 * Creates appropriate error from HTTP response
 */
export function createErrorFromResponse(status: number, body: any, message?: string): NVLPError {
  const errorMessage = message || body?.message || body?.error?.message || 'Unknown error';
  const errorCode = body?.code || body?.error?.code;
  const errorDetails = body?.details || body?.error?.details;

  switch (status) {
    case 400:
      return new ValidationError(errorMessage, errorDetails);
    case 401:
      return new AuthenticationError(errorMessage);
    case 403:
      return new AuthorizationError(errorMessage);
    case 404:
      return new NotFoundError(errorMessage);
    case 408:
      return new TimeoutError(errorMessage);
    case 409:
      return new ConflictError(errorMessage, errorDetails);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(errorMessage, status);
    default:
      return new NVLPError(errorMessage, errorCode || 'UNKNOWN_ERROR', status, errorDetails);
  }
}
