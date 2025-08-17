import { Linking } from 'react-native';
import { env } from '../config/env';
import reactotron from '../config/reactotron';
import ErrorHandlingService from './errorHandlingService';

/**
 * Deep Link Service for Magic Link Authentication
 * 
 * Handles incoming magic links and URL parsing for authentication.
 * Much simpler than OAuth - just handles magic link tokens from Supabase.
 */

export interface MagicLinkData {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string;
  token_type?: string;
  type?: string;
  error?: string;
  error_description?: string;
}

export interface DeepLinkHandler {
  scheme: string;
  handler: (url: string, data: MagicLinkData) => void | Promise<void>;
}

class DeepLinkService {
  private static instance: DeepLinkService;
  private handlers: Map<string, DeepLinkHandler> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  /**
   * Initialize deep link handling
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set up default magic link handler
      this.registerHandler('auth', {
        scheme: 'auth',
        handler: this.handleMagicLink.bind(this),
      });

      // Check if app was opened with a deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        reactotron.log('📱 App opened with deep link:', initialUrl);
        await this.handleURL(initialUrl);
      }

      // Listen for incoming deep links while app is running
      const linkingSubscription = Linking.addEventListener('url', (event) => {
        reactotron.log('📱 Received deep link:', event.url);
        this.handleURL(event.url);
      });

      this.isInitialized = true;
      reactotron.log('🔗 Deep link service initialized');

      // Store subscription for cleanup (you could add a cleanup method)
      // this.linkingSubscription = linkingSubscription;
    } catch (error) {
      reactotron.error('Failed to initialize deep link service:', error as Error);
      ErrorHandlingService.reportError(
        error as Error,
        { service: 'DeepLinkService', operation: 'initialize' }
      );
    }
  }

  /**
   * Register a deep link handler
   */
  registerHandler(key: string, handler: DeepLinkHandler): void {
    this.handlers.set(key, handler);
    reactotron.log(`🔗 Deep link handler registered: ${key}`);
  }

  /**
   * Remove a deep link handler
   */
  unregisterHandler(key: string): void {
    this.handlers.delete(key);
    reactotron.log(`🔗 Deep link handler removed: ${key}`);
  }

  /**
   * Handle incoming URL
   */
  private async handleURL(url: string): Promise<void> {
    try {
      const parsedUrl = new URL(url);
      const scheme = parsedUrl.pathname.split('/')[1]; // e.g., "auth" from "nvlp://auth/callback"
      
      reactotron.log(`🔗 Processing deep link: ${scheme}`);

      const handler = this.handlers.get(scheme);
      if (handler) {
        const magicLinkData = this.parseMagicLinkData(url);
        await handler.handler(url, magicLinkData);
      } else {
        reactotron.warn(`🔗 No handler found for scheme: ${scheme}`);
      }
    } catch (error) {
      reactotron.error('Failed to handle deep link:', error as Error);
      ErrorHandlingService.reportError(
        error as Error,
        { service: 'DeepLinkService', operation: 'handleURL', url }
      );
    }
  }

  /**
   * Parse magic link data from URL
   */
  private parseMagicLinkData(url: string): MagicLinkData {
    try {
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.hash.substring(1)); // Remove # and parse

      const data: MagicLinkData = {};

      // Extract common Supabase auth parameters
      if (params.get('access_token')) data.access_token = params.get('access_token')!;
      if (params.get('refresh_token')) data.refresh_token = params.get('refresh_token')!;
      if (params.get('expires_in')) data.expires_in = params.get('expires_in')!;
      if (params.get('token_type')) data.token_type = params.get('token_type')!;
      if (params.get('type')) data.type = params.get('type')!;
      if (params.get('error')) data.error = params.get('error')!;
      if (params.get('error_description')) data.error_description = params.get('error_description')!;

      reactotron.display({
        name: '🔗 Magic Link Data',
        value: data,
        preview: data.access_token ? 'Authentication successful' : 'Authentication data',
      });

      return data;
    } catch (error) {
      reactotron.error('Failed to parse magic link data:', error as Error);
      return {};
    }
  }

  /**
   * Default magic link handler
   */
  private async handleMagicLink(url: string, data: MagicLinkData): Promise<void> {
    try {
      if (data.error) {
        reactotron.error(`🔗 Magic link error: ${data.error} - ${data.error_description}`);
        // You could emit an event or call a callback here
        return;
      }

      if (data.access_token) {
        reactotron.log('✅ Magic link authentication successful');
        
        // Here you would typically:
        // 1. Create a Supabase session from the tokens
        // 2. Store the session securely
        // 3. Update app state to authenticated
        // 4. Navigate to the main app
        
        // For now, just log the successful authentication
        reactotron.display({
          name: '✅ Magic Link Success',
          value: {
            hasAccessToken: !!data.access_token,
            hasRefreshToken: !!data.refresh_token,
            tokenType: data.token_type,
            expiresIn: data.expires_in,
            type: data.type,
          },
          preview: 'Magic link authentication successful',
        });
      }
    } catch (error) {
      reactotron.error('Failed to handle magic link:', error as Error);
      ErrorHandlingService.reportError(
        error as Error,
        { service: 'DeepLinkService', operation: 'handleMagicLink', url }
      );
    }
  }

  /**
   * Get the magic link redirect URL for this app
   */
  getMagicLinkRedirectURL(): string {
    return `${env.DEEP_LINK_SCHEME}://auth/callback`;
  }

  /**
   * Check if deep linking is properly configured
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!env.DEEP_LINK_SCHEME) {
      errors.push('DEEP_LINK_SCHEME is not configured');
    }

    // Check if the URL scheme follows the expected format
    const redirectURL = this.getMagicLinkRedirectURL();
    if (!redirectURL.includes('://')) {
      errors.push('Invalid deep link scheme format');
    }

    const isValid = errors.length === 0;

    reactotron.display({
      name: '🔗 Deep Link Configuration',
      value: {
        isValid,
        errors,
        redirectURL,
        scheme: env.DEEP_LINK_SCHEME,
        isInitialized: this.isInitialized,
        handlerCount: this.handlers.size,
      },
      preview: isValid ? 'Configuration valid' : `${errors.length} error(s)`,
    });

    return { isValid, errors };
  }

  /**
   * Test deep link parsing (for development)
   */
  testMagicLink(testUrl: string): MagicLinkData {
    reactotron.log(`🧪 Testing magic link parsing: ${testUrl}`);
    return this.parseMagicLinkData(testUrl);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    isInitialized: boolean;
    handlerCount: number;
    redirectURL: string;
    handlers: string[];
  } {
    return {
      isInitialized: this.isInitialized,
      handlerCount: this.handlers.size,
      redirectURL: this.getMagicLinkRedirectURL(),
      handlers: Array.from(this.handlers.keys()),
    };
  }
}

// Export singleton instance
export default DeepLinkService.getInstance();

// Also export the class for testing
export { DeepLinkService };