/**
 * Enhanced Authentication Interceptor
 * 
 * Integrates token management with API requests and handles token refresh
 */

import { tokenManager } from '../auth/tokenManager';
import { transformError } from './errors';
import type { RequestInterceptor, ResponseInterceptor } from './interceptors';

/**
 * Request interceptor that adds authentication headers
 */
export const enhancedAuthInterceptor: RequestInterceptor = {
  id: 'enhanced-auth',
  handler: async (config) => {
    try {
      // Check if we have valid tokens
      if (tokenManager.hasValidTokens()) {
        const accessToken = tokenManager.getAccessToken();
        if (accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
      }

      // Check if token needs refresh before making the request
      if (tokenManager.needsRefresh()) {
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          try {
            console.log('[Auth Interceptor] Token needs refresh, refreshing...');
            await tokenManager.refreshTokens();
            
            // Update the authorization header with the new token
            const newAccessToken = tokenManager.getAccessToken();
            if (newAccessToken) {
              config.headers['Authorization'] = `Bearer ${newAccessToken}`;
            }
          } catch (error) {
            console.error('[Auth Interceptor] Token refresh failed:', error);
            // Continue with the request - the response interceptor will handle 401
          }
        }
      }

      // Add client information
      config.headers['X-Client-Type'] = 'react-native';
      config.headers['X-Client-Version'] = '1.0.0';
      
      return config;
    } catch (error) {
      console.error('[Auth Interceptor] Request processing failed:', error);
      return config;
    }
  },
};

/**
 * Response interceptor that handles authentication errors
 */
export const authResponseInterceptor: ResponseInterceptor = {
  id: 'auth-response',
  fulfilled: (response) => {
    // Check if response contains new token information
    if (response.data && response.data.session) {
      const session = response.data.session;
      if (session.access_token) {
        try {
          const tokenData = tokenManager.createTokenData(
            session.access_token,
            session.refresh_token,
            response.data.user || tokenManager.getUser(),
            session.expires_in
          );
          
          tokenManager.saveTokens(tokenData);
          console.log('[Auth Interceptor] Updated tokens from response');
        } catch (error) {
          console.error('[Auth Interceptor] Failed to update tokens from response:', error);
        }
      }
    }
    
    return response;
  },
  rejected: async (error) => {
    const response = error.response;
    
    // Handle 401 Unauthorized
    if (response?.status === 401) {
      console.log('[Auth Interceptor] Received 401, handling authentication error');
      
      // Check if we have a refresh token to try
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken && !error.config?.skipAuthRetry) {
        try {
          console.log('[Auth Interceptor] Attempting token refresh for 401 error');
          await tokenManager.refreshTokens();
          
          // Mark the request to skip auth retry on next attempt
          error.config.skipAuthRetry = true;
          
          // Update the authorization header with the new token
          const newAccessToken = tokenManager.getAccessToken();
          if (newAccessToken) {
            error.config.headers['Authorization'] = `Bearer ${newAccessToken}`;
          }
          
          // Note: The actual retry will be handled by the retry interceptor
          // We just update the config and let it bubble up
          console.log('[Auth Interceptor] Token refreshed, request will be retried');
        } catch (refreshError) {
          console.error('[Auth Interceptor] Token refresh failed for 401:', refreshError);
          
          // Clear tokens and handle token expiration
          await tokenManager.clearTokens();
          await tokenManager.handleTokenExpiration();
        }
      } else {
        // No refresh token available or already tried refresh
        console.log('[Auth Interceptor] No refresh token or retry already attempted');
        await tokenManager.clearTokens();
        await tokenManager.handleTokenExpiration();
      }
    }
    
    return Promise.reject(error);
  },
};

/**
 * Token validation interceptor for critical operations
 */
export const tokenValidationInterceptor: RequestInterceptor = {
  id: 'token-validation',
  handler: async (config) => {
    // For critical operations, ensure we have a valid token
    const criticalEndpoints = ['/auth/logout', '/profile', '/budgets', '/envelopes'];
    const isCriticalEndpoint = criticalEndpoints.some(endpoint => 
      config.url.includes(endpoint)
    );
    
    if (isCriticalEndpoint && !tokenManager.hasValidTokens()) {
      throw transformError(new Error('Valid authentication token required for this operation'));
    }
    
    return config;
  },
};

/**
 * Initialize authentication interceptors
 */
export function initializeAuthInterceptors() {
  // These will be added to the interceptor manager
  return {
    enhancedAuthInterceptor,
    authResponseInterceptor,
    tokenValidationInterceptor,
  };
}