/**
 * API Services
 * 
 * Centralized exports for all API-related services and utilities
 */

// Core client
export { apiClient, default as client } from './client';
export type { NVLPClient } from './client';

// Domain services
export { authService } from './authService';
export { budgetService } from './budgetService';
export { envelopeService } from './envelopeService';
export { userService } from './userService';

// Centralized API service
export { apiService } from './apiService';

// Error handling
export { transformError, showError, logError, ErrorType } from './errors';
export type { ApiError } from './errors';

// Network utilities
export { networkUtils } from './networkUtils';
export type { NetworkState } from './networkUtils';

// Service types
export type { LoginCredentials, RegisterCredentials, AuthResult } from './authService';
