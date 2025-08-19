import { Linking, Alert } from 'react-native';
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
  private pendingURLs: string[] = [];
  private processedURLs: Set<string> = new Set(); // Track processed URLs to avoid duplicates

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
      // DON'T set up default handler - let the auth system register its own handler
      // This prevents duplicate processing of magic links

      // Check if app was opened with a deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('📱 App opened with deep link:', initialUrl);
        reactotron.log('📱 App opened with deep link:', initialUrl);
        // Store it for later processing when handler is registered
        this.pendingURLs.push(initialUrl);
      }

      // Listen for incoming deep links while app is running
      console.log('🔗 Setting up deep link event listener...');
      const linkingSubscription = Linking.addEventListener('url', (event) => {
        console.log('📱 Deep link event received:', event.url);
        reactotron.log('📱 Received deep link:', event.url);
        this.handleURL(event.url);
      });

      this.isInitialized = true;
      console.log('✅ Deep link service initialized successfully');
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
    console.log(`🔗 Registering handler for key: ${key}`);
    this.handlers.set(key, handler);
    reactotron.log(`🔗 Deep link handler registered: ${key}`);
    
    // Process any pending URLs for this handler
    const pendingForThisHandler = this.pendingURLs.filter(url => {
      try {
        const parsedUrl = new URL(url);
        const scheme = parsedUrl.hostname || parsedUrl.host;
        return scheme === key;
      } catch {
        return false;
      }
    });
    
    if (pendingForThisHandler.length > 0) {
      console.log(`🔗 Processing ${pendingForThisHandler.length} pending URLs for ${key}`);
      pendingForThisHandler.forEach(url => {
        this.handleURL(url);
        // Remove from pending
        const index = this.pendingURLs.indexOf(url);
        if (index > -1) {
          this.pendingURLs.splice(index, 1);
        }
      });
    }
    
    // No need for stored magic link data since we don't use default handler anymore
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
      console.log('🔗 DeepLinkService.handleURL called with:', url);
      
      // Skip if we've already processed this exact URL
      if (this.processedURLs.has(url)) {
        console.log('🔗 URL already processed, skipping:', url);
        return;
      }
      this.processedURLs.add(url);
      
      // For nvlp://auth/callback, "auth" is the hostname and "/callback" is the path
      // We want to use "auth" as our scheme identifier
      const parsedUrl = new URL(url);
      const scheme = parsedUrl.hostname || parsedUrl.host; // Use hostname which is "auth"
      
      console.log(`🔗 URL hostname: ${parsedUrl.hostname}`);
      console.log(`🔗 URL pathname: ${parsedUrl.pathname}`);
      console.log(`🔗 Processing deep link scheme: ${scheme}`);
      console.log(`🔗 Available handlers:`, Array.from(this.handlers.keys()));
      reactotron.log(`🔗 Processing deep link: ${scheme}`);

      const handler = this.handlers.get(scheme);
      if (handler) {
        console.log(`🔗 Found handler for scheme: ${scheme}`);
        const magicLinkData = this.parseMagicLinkData(url);
        console.log(`🔗 Parsed magic link data:`, magicLinkData);
        await handler.handler(url, magicLinkData);
      } else {
        console.warn(`🔗 No handler found for scheme: ${scheme}, queuing URL`);
        reactotron.warn(`🔗 No handler found for scheme: ${scheme}, queuing URL`);
        // Store the URL to process later when handler is registered
        this.pendingURLs.push(url);
      }
    } catch (error) {
      console.error('Failed to handle deep link:', error);
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
      console.log('🔍 Parsing magic link URL:', url);
      const parsedUrl = new URL(url);
      console.log('🔍 URL hash:', parsedUrl.hash);
      console.log('🔍 URL search:', parsedUrl.search);
      
      const params = new URLSearchParams(parsedUrl.hash.substring(1)); // Remove # and parse
      console.log('🔍 Parsed params:', Array.from(params.entries()));

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
    pendingURLs: string[];
  } {
    return {
      isInitialized: this.isInitialized,
      handlerCount: this.handlers.size,
      redirectURL: this.getMagicLinkRedirectURL(),
      handlers: Array.from(this.handlers.keys()),
      pendingURLs: this.pendingURLs,
    };
  }
}

// Export singleton instance
export default DeepLinkService.getInstance();

// Also export the class for testing
export { DeepLinkService };