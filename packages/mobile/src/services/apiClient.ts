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
import reactotron from '../config/reactotron';

/**
 * React Native Session Provider that integrates with our secure storage
 */
class ReactNativeSessionProvider implements SessionProvider {
  private currentSession: Session | null = null;
  private sessionChangeHandlers: ((session: Session | null) => void)[] = [];

  constructor() {
    this.loadStoredSession();
  }

  /**
   * Load session from secure storage on initialization
   */
  private async loadStoredSession(): Promise<void> {
    try {
      const tokens = await SecureStorageService.getAuthTokens();
      if (tokens) {
        this.currentSession = this.createSessionFromTokens(tokens);
      }
    } catch (error) {
      console.error('Failed to load stored session:', error);
    }
  }

  /**
   * Convert our AuthTokens to Supabase Session format
   */
  private createSessionFromTokens(tokens: AuthTokens): Session {
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: Math.floor(tokens.expiresAt / 1000), // Convert to seconds
      expires_in: Math.floor((tokens.expiresAt - Date.now()) / 1000),
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
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    // Check if current session is still valid
    if (this.currentSession && this.currentSession.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= this.currentSession.expires_at) {
        // Session expired, clear it
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
    const session = await this.getSession();
    if (!session) {
      throw new Error('No valid session available. Please authenticate.');
    }

    // If session is close to expiring (within 5 minutes), we should refresh
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const fiveMinutes = 5 * 60;

    if (expiresAt - now < fiveMinutes) {
      // In a real app, this would trigger a token refresh
      // For now, we'll just return the current session
      console.warn('Session is close to expiring. Token refresh should be implemented.');
    }

    return session;
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
        expiresAt: (session.expires_at || 0) * 1000, // Convert to milliseconds
        userId: session.user.id,
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

    // Get device info for headers
    const deviceInfo = await SecureStorageService.getDeviceInfo();

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
        ...(deviceInfo?.deviceId && { 'X-Device-ID': deviceInfo.deviceId }),
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
      deviceId: deviceInfo?.deviceId,
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

    // Listen for session invalidation errors
    // The client should emit these when it receives 401 responses
    // This is a placeholder for the actual error handling implementation
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
   * Reinitialize the client (useful after config changes)
   */
  static async reinitialize(config?: Partial<NVLPClientConfig>): Promise<NVLPClient> {
    this.dispose();
    return this.initialize(config);
  }
}

// Export session provider class for external use
export { ReactNativeSessionProvider };

// Default export
export default ApiClientService;