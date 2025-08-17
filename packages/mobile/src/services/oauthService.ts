import { authorize, AuthorizeResult, ServiceConfiguration } from 'react-native-app-auth';
import { env } from '../config/env';
import reactotron from '../config/reactotron';
import ErrorHandlingService from './errorHandlingService';

/**
 * OAuth Authentication Service
 * 
 * Provides secure OAuth flows for authentication using react-native-app-auth.
 * Supports multiple OAuth providers and custom configurations.
 */

export interface OAuthConfig {
  issuer?: string;
  clientId: string;
  clientSecret?: string;
  redirectUrl: string;
  scopes: string[];
  additionalParameters?: Record<string, string>;
  customHeaders?: Record<string, string>;
  useNonce?: boolean;
  usePKCE?: boolean;
  warmAndPrefetchChrome?: boolean;
}

export interface OAuthResult {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  expiresAt: number;
  scopes: string[];
  authorizationCode?: string;
  codeVerifier?: string;
  state?: string;
}

export interface OAuthProvider {
  name: string;
  config: OAuthConfig;
  serviceConfiguration?: ServiceConfiguration;
}

class OAuthService {
  private static instance: OAuthService;
  private providers: Map<string, OAuthProvider> = new Map();

  private constructor() {
    this.initializeDefaultProviders();
  }

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Initialize default OAuth providers based on environment configuration
   */
  private initializeDefaultProviders(): void {
    // Supabase OAuth provider
    this.addProvider('supabase', {
      name: 'Supabase',
      config: {
        issuer: `${env.SUPABASE_URL}/auth/v1`,
        clientId: env.SUPABASE_ANON_KEY,
        redirectUrl: `${env.DEEP_LINK_SCHEME}://auth/callback`,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
        useNonce: true,
        warmAndPrefetchChrome: true,
        additionalParameters: {
          provider: 'email', // For Supabase magic link
        },
      },
    });

    // Google OAuth provider (for future use)
    this.addProvider('google', {
      name: 'Google',
      config: {
        issuer: 'https://accounts.google.com',
        clientId: 'your-google-client-id.googleusercontent.com',
        redirectUrl: `${env.DEEP_LINK_SCHEME}://auth/google/callback`,
        scopes: ['openid', 'profile', 'email'],
        usePKCE: true,
        useNonce: true,
        warmAndPrefetchChrome: true,
      },
    });

    // Apple OAuth provider (for future use)
    this.addProvider('apple', {
      name: 'Apple',
      config: {
        issuer: 'https://appleid.apple.com',
        clientId: 'your-apple-service-id',
        redirectUrl: `${env.DEEP_LINK_SCHEME}://auth/apple/callback`,
        scopes: ['openid', 'email', 'name'],
        usePKCE: true,
        useNonce: true,
      },
    });

    reactotron.log('🔐 OAuth providers initialized');
  }

  /**
   * Add or update an OAuth provider
   */
  addProvider(key: string, provider: OAuthProvider): void {
    this.providers.set(key, provider);
    reactotron.log(`📝 OAuth provider added: ${provider.name}`);
  }

  /**
   * Get an OAuth provider by key
   */
  getProvider(key: string): OAuthProvider | undefined {
    return this.providers.get(key);
  }

  /**
   * Get all available OAuth providers
   */
  getProviders(): Map<string, OAuthProvider> {
    return new Map(this.providers);
  }

  /**
   * Authenticate with a specific OAuth provider
   */
  async authenticate(providerKey: string): Promise<OAuthResult> {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new Error(`OAuth provider '${providerKey}' not found`);
    }

    try {
      reactotron.log(`🔑 Starting OAuth authentication with ${provider.name}`);
      
      const config = provider.serviceConfiguration 
        ? { serviceConfiguration: provider.serviceConfiguration, ...provider.config }
        : provider.config;

      const result: AuthorizeResult = await authorize(config);

      // Convert to our standard format
      const oauthResult: OAuthResult = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        idToken: result.idToken,
        tokenType: result.tokenType || 'Bearer',
        expiresAt: result.accessTokenExpirationDate 
          ? new Date(result.accessTokenExpirationDate).getTime()
          : Date.now() + (3600 * 1000), // Default 1 hour
        scopes: result.scopes || provider.config.scopes,
        authorizationCode: result.authorizationCode,
        codeVerifier: result.codeVerifier,
        state: result.state,
      };

      reactotron.log(`✅ OAuth authentication successful with ${provider.name}`);
      reactotron.display({
        name: '🔐 OAuth Result',
        value: {
          provider: provider.name,
          tokenType: oauthResult.tokenType,
          hasAccessToken: !!oauthResult.accessToken,
          hasRefreshToken: !!oauthResult.refreshToken,
          hasIdToken: !!oauthResult.idToken,
          expiresAt: new Date(oauthResult.expiresAt).toISOString(),
          scopes: oauthResult.scopes,
        },
        preview: `${provider.name} authentication successful`,
      });

      return oauthResult;
    } catch (error) {
      const errorMessage = `OAuth authentication failed for ${provider.name}: ${error}`;
      reactotron.error(errorMessage, error as Error);
      
      // Report error to error handling service
      ErrorHandlingService.reportError(
        error as Error,
        { provider: provider.name, operation: 'oauth_authenticate' }
      );

      throw new Error(errorMessage);
    }
  }

  /**
   * Authenticate with Supabase (primary provider)
   */
  async authenticateWithSupabase(): Promise<OAuthResult> {
    return this.authenticate('supabase');
  }

  /**
   * Authenticate with Google (if configured)
   */
  async authenticateWithGoogle(): Promise<OAuthResult> {
    return this.authenticate('google');
  }

  /**
   * Authenticate with Apple (if configured)
   */
  async authenticateWithApple(): Promise<OAuthResult> {
    return this.authenticate('apple');
  }

  /**
   * Get the redirect URL for a specific provider
   */
  getRedirectUrl(providerKey: string): string {
    const provider = this.providers.get(providerKey);
    return provider?.config.redirectUrl || `${env.DEEP_LINK_SCHEME}://auth/callback`;
  }

  /**
   * Check if a provider is configured and ready
   */
  isProviderReady(providerKey: string): boolean {
    const provider = this.providers.get(providerKey);
    if (!provider) return false;

    const config = provider.config;
    return !!(config.clientId && config.redirectUrl && config.scopes.length > 0);
  }

  /**
   * Validate OAuth configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check environment variables
    if (!env.DEEP_LINK_SCHEME) {
      errors.push('DEEP_LINK_SCHEME is not configured');
    }

    if (!env.SUPABASE_URL) {
      errors.push('SUPABASE_URL is not configured');
    }

    if (!env.SUPABASE_ANON_KEY) {
      errors.push('SUPABASE_ANON_KEY is not configured');
    }

    // Check provider configurations
    this.providers.forEach((provider, key) => {
      if (!provider.config.clientId) {
        errors.push(`Provider '${key}' missing clientId`);
      }
      if (!provider.config.redirectUrl) {
        errors.push(`Provider '${key}' missing redirectUrl`);
      }
      if (!provider.config.scopes.length) {
        errors.push(`Provider '${key}' missing scopes`);
      }
    });

    const isValid = errors.length === 0;

    if (env.NODE_ENV === 'development') {
      reactotron.display({
        name: '🔍 OAuth Configuration Validation',
        value: { isValid, errors, providerCount: this.providers.size },
        preview: isValid ? 'Configuration valid' : `${errors.length} error(s) found`,
      });
    }

    return { isValid, errors };
  }

  /**
   * Get OAuth provider statistics
   */
  getProviderStats(): {
    totalProviders: number;
    readyProviders: number;
    configuredProviders: string[];
    readyProviders: string[];
  } {
    const configuredProviders: string[] = [];
    const readyProviders: string[] = [];

    this.providers.forEach((provider, key) => {
      configuredProviders.push(key);
      if (this.isProviderReady(key)) {
        readyProviders.push(key);
      }
    });

    return {
      totalProviders: this.providers.size,
      readyProviders: readyProviders.length,
      configuredProviders,
      readyProviders,
    };
  }
}

// Export singleton instance
export default OAuthService.getInstance();

// Also export the class for testing
export { OAuthService };