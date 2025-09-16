/**
 * NVLP API Client Service for React Native
 * 
 * Provides a configured NVLP client instance with React Native specific
 * session management, offline storage, and error handling.
 * 
 * Features:
 * - Automatic token management with SecureStorageService
 * - Offline queue with AsyncStorage
 * - Device ID integration for session tracking
 * - React Native compatible error handling
 */

import { createNVLPClient, NVLPClient, NVLPClientConfig, SessionProvider } from '@nvlp/client';
import { Session } from '@supabase/supabase-js';
import SecureStorageService, { AuthTokens } from './secureStorage';
import LocalStorageService from './localStorage';
import { env, validateEnv } from '../config/env';
import { getDeviceHeaders } from '../utils/device';
import reactotron from '../config/reactotron';

/**
 * React Native Session Provider that integrates with our secure storage
 */
class ReactNativeSessionProvider implements SessionProvider {
  private currentSession: Session | null = null;
  private sessionChangeHandlers: ((session: Session | null) => void)[] = [];
  private refreshPromise: Promise<Session | null> | null = null;

  constructor() {
    // Don't auto-load on construction - wait for explicit initialization
  }

  /**
   * Load session from secure storage
   */
  async loadStoredSession(): Promise<void> {
    try {
      const tokens = await SecureStorageService.getAuthTokens();
      if (tokens) {
        this.currentSession = this.createSessionFromTokens(tokens);
        console.log('🔐 Loaded stored session:', {
          hasSession: !!this.currentSession,
          expiresAt: this.currentSession?.expires_at,
          tokensHadExpiresAt: !!tokens.expiresAt,
          storedExpiresAt: tokens.expiresAt
        });
      }
    } catch (error) {
      console.error('Failed to load stored session:', error);
    }
  }

  /**
   * Convert our AuthTokens to Supabase Session format
   */
  private createSessionFromTokens(tokens: AuthTokens): Session {
    // Use the stored expires_at if available, otherwise calculate based on lastActivity

    let expiresAt: number;
    if (tokens.expiresAt) {
      // Use the actual expiry time from the token
      expiresAt = tokens.expiresAt;
    } else {
      // Fallback: assume 1 hour from lastActivity (shouldn't happen with new tokens)
      const expiresInMs = 60 * 60 * 1000; // 1 hour
      expiresAt = Math.floor((tokens.lastActivity + expiresInMs) / 1000);
      console.warn('⚠️ No expiresAt in stored tokens, using fallback calculation');
    }
    
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: expiresAt,
      expires_in: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
      token_type: 'bearer',
      user: {
        id: tokens.userId,
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: '', // Will be populated from actual auth
        app_metadata: {},
        user_metadata: {},
      },
    };
  }

  /**
   * Refresh an expired or soon-to-expire session
   */
  private async refreshSession(session: Session): Promise<Session | null> {
    if (!session.refresh_token) {
      throw new Error('No refresh token available');
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      console.log('🔄 Refresh already in progress, waiting...');
      return await this.refreshPromise;
    }

    // Start a new refresh process
    this.refreshPromise = this.performRefresh(session);
    
    try {
      const result = await this.refreshPromise;
      this.refreshPromise = null;
      return result;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  /**
   * Actually perform the token refresh
   */
  private async performRefresh(session: Session): Promise<Session | null> {
    try {
      console.log('🔄 Starting token refresh...');
      
      // Use Supabase's auth API to refresh the token
      const refreshUrl = `${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`;
      
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          refresh_token: session.refresh_token,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();
      
      if (tokenData.error) {
        throw new Error(`Token refresh error: ${tokenData.error.message}`);
      }

      // Create new session with refreshed tokens
      const refreshedSession: Session = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type || 'bearer',
        user: tokenData.user || session.user,
      };

      console.log('✅ Token refresh successful', {
        newExpiresAt: refreshedSession.expires_at,
        expiresIn: refreshedSession.expires_in
      });

      return refreshedSession;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    // Check if current session is still valid
    if (this.currentSession && this.currentSession.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      const isExpired = now >= this.currentSession.expires_at;
      
      console.log('🔐 Session check:', {
        now,
        expiresAt: this.currentSession.expires_at,
        isExpired,
        hasRefreshToken: !!this.currentSession.refresh_token
      });
      
      if (isExpired) {
        console.log('🔄 Session expired, attempting refresh...');
        // Session expired, try to refresh it before clearing
        try {
          const refreshedSession = await this.refreshSession(this.currentSession);
          if (refreshedSession) {
            console.log('✅ Token refreshed successfully');
            await this.setSession(refreshedSession);
            return refreshedSession;
          }
        } catch (error) {
          console.error('❌ Failed to refresh expired session:', error);
        }
        
        // If refresh failed, clear the expired session
        console.log('🗑️ Clearing expired session');
        this.currentSession = null;
        await SecureStorageService.clearAuthTokens();
      }
    }

    return this.currentSession;
  }

  /**
   * Ensure we have a valid session (refresh if needed)
   */
  async ensureValidSession(): Promise<Session> {
    // First, check if we have stored tokens (even if expired)
    const storedTokens = await SecureStorageService.getAuthTokens();
    if (!storedTokens || !storedTokens.refreshToken) {
      throw new Error('No valid session available. Please authenticate.');
    }

    // Check if current session exists and is still valid
    const session = await this.getSession();
    
    // If we have a valid session, return it
    if (session) {
      // If session is close to expiring (within 5 minutes), proactively refresh
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const fiveMinutes = 5 * 60;

      if (expiresAt - now < fiveMinutes) {
        console.log('🔄 Session expiring soon, proactively refreshing...');
        try {
          const refreshedSession = await this.refreshSession(session);
          if (refreshedSession) {
            await this.setSession(refreshedSession);
            return refreshedSession;
          }
        } catch (error) {
          console.error('Failed to proactively refresh session:', error);
          // Continue with current session if proactive refresh fails
        }
      }
      return session;
    }

    // No valid session but we have tokens - try to refresh using stored tokens
    console.log('🔄 No valid session but have stored tokens, attempting refresh...');
    try {
      const mockExpiredSession: Session = {
        access_token: storedTokens.accessToken,
        refresh_token: storedTokens.refreshToken,
        expires_at: storedTokens.expiresAt || Math.floor(Date.now() / 1000) - 1, // Expired
        expires_in: 0,
        token_type: 'bearer',
        user: {
          id: storedTokens.userId,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email: '',
          app_metadata: {},
          user_metadata: {},
        },
      };

      const refreshedSession = await this.refreshSession(mockExpiredSession);
      if (refreshedSession) {
        await this.setSession(refreshedSession);
        console.log('✅ Successfully refreshed expired session');
        return refreshedSession;
      }
    } catch (error) {
      console.error('❌ Failed to refresh expired session:', error);
      // Clear stored tokens since refresh failed
      await this.clearSession();
    }

    throw new Error('Session expired and refresh failed. Please authenticate again.');
  }

  /**
   * Set a new session (called after successful authentication)
   */
  async setSession(session: Session | null): Promise<void> {
    this.currentSession = session;

    if (session) {
      // Store tokens securely
      const tokens: AuthTokens = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        userId: session.user.id,
        lastActivity: Date.now(),
        expiresAt: session.expires_at, // Store the actual expiry time
      };
      
      await SecureStorageService.setAuthTokens(tokens);
    } else {
      // Clear stored tokens on logout
      await SecureStorageService.clearAuthTokens();
    }

    // Notify all session change handlers
    this.sessionChangeHandlers.forEach(handler => handler(session));
  }

  /**
   * Register a session change handler
   */
  onSessionChange(handler: (session: Session | null) => void): () => void {
    this.sessionChangeHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.sessionChangeHandlers.indexOf(handler);
      if (index > -1) {
        this.sessionChangeHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Clear current session
   */
  async clearSession(): Promise<void> {
    // Cancel any pending refresh
    this.refreshPromise = null;
    await this.setSession(null);
  }
}

/**
 * NVLP API Client Service
 */
export class ApiClientService {
  private static instance: NVLPClient | null = null;
  private static sessionProvider: ReactNativeSessionProvider | null = null;

  /**
   * Initialize the NVLP client with React Native configuration
   */
  static async initialize(config?: Partial<NVLPClientConfig>): Promise<NVLPClient> {
    if (this.instance) {
      return this.instance;
    }

    // Log initialization to Reactotron
    reactotron.log('🔌 Initializing API Client...');

    // Create session provider
    this.sessionProvider = new ReactNativeSessionProvider();
    
    // Load stored session into the provider
    await this.sessionProvider.loadStoredSession();

    // Get device headers for all API requests
    const deviceHeaders = await getDeviceHeaders();
    
    // Get device ID separately for the config
    const { getDeviceId } = await import('../utils/device');
    const deviceId = await getDeviceId();

    // Validate environment variables
    validateEnv();

    // Default configuration for React Native
    const defaultConfig: NVLPClientConfig = {
      supabaseUrl: env.SUPABASE_URL,
      supabaseAnonKey: env.SUPABASE_ANON_KEY,
      sessionProvider: this.sessionProvider,
      headers: {
        'X-Client-Type': 'react-native',
        'X-Client-Version': '1.0.0',
        ...deviceHeaders,
      },
      timeout: 30000, // 30 seconds
      offlineQueue: {
        enabled: true,
        maxSize: 100,
        storage: {
          // Use AsyncStorage for offline queue
          async getItem(key: string): Promise<string | null> {
            const data = await LocalStorageService.getCachedData<string>(key);
            return data;
          },
          async setItem(key: string, value: string): Promise<void> {
            await LocalStorageService.setCachedData(key, value, 24 * 60 * 60 * 1000); // 24 hours TTL
          },
          async removeItem(key: string): Promise<void> {
            await LocalStorageService.removeCachedData(key);
          },
          async clear(): Promise<void> {
            await LocalStorageService.clearCache('all');
          },
        },
      },
      deviceId,
      ...config,
    };

    // Create the client
    this.instance = createNVLPClient(defaultConfig);

    // Set up error handling for session invalidation
    this.setupErrorHandling();

    // Log successful initialization to Reactotron
    reactotron.log('✅ API Client initialized successfully');
    reactotron.display({
      name: '🔌 API Client Config',
      value: {
        supabaseUrl: defaultConfig.supabaseUrl,
        hasAnonKey: !!defaultConfig.supabaseAnonKey,
        deviceId: defaultConfig.deviceId,
        timeout: defaultConfig.timeout,
        offlineQueueEnabled: defaultConfig.offlineQueue?.enabled,
      },
      preview: 'API Client Configuration',
    });

    return this.instance;
  }

  /**
   * Get the current client instance
   */
  static getClient(): NVLPClient {
    if (!this.instance) {
      throw new Error('API client not initialized. Call ApiClientService.initialize() first.');
    }
    return this.instance;
  }

  /**
   * Get the session provider
   */
  static getSessionProvider(): ReactNativeSessionProvider {
    if (!this.sessionProvider) {
      throw new Error('Session provider not initialized. Call ApiClientService.initialize() first.');
    }
    return this.sessionProvider;
  }

  /**
   * Set up error handling for common scenarios
   */
  private static setupErrorHandling(): void {
    if (!this.instance) return;

    // Listen for session invalidation errors from the NVLP client
    this.instance.on('sessionInvalidated', this.handleSessionInvalidated.bind(this));
  }

  /**
   * Handle session invalidation from the API
   */
  private static async handleSessionInvalidated(errorMessage: string): Promise<void> {
    reactotron.log('🚨 Session invalidated by API:', errorMessage);

    try {
      // Clear local session data
      if (this.sessionProvider) {
        await this.sessionProvider.clearSession();
      }

      // Clear cached data
      await LocalStorageService.clearCache('all');

      // Clear device info (but keep device ID for future registrations)
      const { clearDeviceInfo } = await import('../utils/device');
      await clearDeviceInfo();

      // Log to Reactotron for debugging
      reactotron.display({
        name: '🚨 Session Invalidated',
        value: {
          reason: errorMessage,
          timestamp: new Date().toISOString(),
          action: 'All local data cleared, user needs to re-authenticate',
        },
        preview: `Session invalidated: ${errorMessage}`,
      });

      // The app should listen for this event to show UI and redirect to login
      // We don't handle UI here since this is a service layer
      console.warn('[ApiClient] Session invalidated:', errorMessage);
    } catch (cleanupError) {
      reactotron.error('Failed to clean up after session invalidation:', cleanupError as Error);
      console.error('[ApiClient] Failed to clean up after session invalidation:', cleanupError);
    }
  }

  /**
   * Authenticate with magic link tokens
   */
  static async authenticate(session: Session): Promise<void> {
    if (!this.sessionProvider) {
      throw new Error('Session provider not initialized');
    }

    await this.sessionProvider.setSession(session);
  }

  /**
   * Sign out and clear all session data
   */
  static async signOut(): Promise<void> {
    if (!this.sessionProvider) {
      throw new Error('Session provider not initialized');
    }

    await this.sessionProvider.clearSession();
    
    // Also clear any cached data
    await LocalStorageService.clearCache('all');
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    if (!this.sessionProvider) {
      return false;
    }

    const session = await this.sessionProvider.getSession();
    return !!session;
  }

  /**
   * Get current user ID
   */
  static async getCurrentUserId(): Promise<string | null> {
    if (!this.sessionProvider) {
      return null;
    }

    const session = await this.sessionProvider.getSession();
    return session?.user?.id || null;
  }

  /**
   * Dispose of the client and clean up resources
   */
  static dispose(): void {
    if (this.instance) {
      this.instance.dispose?.();
      this.instance = null;
    }
    this.sessionProvider = null;
  }

  /**
   * Reload the session from storage (useful after tokens are updated)
   */
  static async reloadSession(): Promise<void> {
    if (!this.sessionProvider) {
      console.warn('⚠️ ApiClientService: No session provider to reload');
      return;
    }
    
    console.log('🔄 ApiClientService: Reloading session from storage...');
    await this.sessionProvider.loadStoredSession();
    console.log('✅ ApiClientService: Session reloaded');
  }

  /**
   * Reinitialize the client (useful after config changes)
   */
  static async reinitialize(config?: Partial<NVLPClientConfig>): Promise<NVLPClient> {
    this.dispose();
    return this.initialize(config);
  }

  /**
   * Listen for session invalidation events
   * Returns an unsubscribe function
   */
  static onSessionInvalidated(handler: (errorMessage: string) => void): () => void {
    if (!this.instance) {
      throw new Error('API client not initialized. Call ApiClientService.initialize() first.');
    }

    this.instance.on('sessionInvalidated', handler);

    // Return unsubscribe function
    return () => {
      if (this.instance) {
        this.instance.off('sessionInvalidated', handler);
      }
    };
  }
}

// Export session provider class for external use
export { ReactNativeSessionProvider };

// Default export
export default ApiClientService;