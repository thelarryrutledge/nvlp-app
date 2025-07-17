/**
 * Authentication Service
 * 
 * Service layer for authentication operations with error handling
 */

import { apiClient } from './client';
import { transformError, logError, type ApiError } from './errors';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResult {
  user: any;
  session?: any;
}

class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const result = await apiClient.login(credentials.email, credentials.password);
      return result;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'AuthService.login');
      throw apiError;
    }
  }

  /**
   * Register new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResult> {
    try {
      const result = await apiClient.register(
        credentials.email, 
        credentials.password, 
        credentials.displayName
      );
      return result;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'AuthService.register');
      throw apiError;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.logout();
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'AuthService.logout');
      throw apiError;
    }
  }

  /**
   * Request password reset
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await apiClient.resetPassword(email);
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'AuthService.resetPassword');
      throw apiError;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      await apiClient.updatePassword(newPassword);
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'AuthService.updatePassword');
      throw apiError;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<{ session: any }> {
    try {
      const result = await apiClient.refreshToken();
      return result;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'AuthService.refreshToken');
      throw apiError;
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState() {
    return apiClient.getAuthState();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }

  /**
   * Check if token needs refresh
   */
  needsTokenRefresh(): boolean {
    return apiClient.needsTokenRefresh();
  }
}

export const authService = new AuthService();