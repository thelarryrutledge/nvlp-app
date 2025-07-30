import { PostgRESTConfig, PostgRESTClient, createPostgRESTClient } from './postgrest-client';

/**
 * Environment-based configuration
 */
export interface ClientConfig {
  /** Supabase URL (from SUPABASE_URL env var or explicit) */
  supabaseUrl?: string;
  /** Supabase anonymous key (from SUPABASE_ANON_KEY env var or explicit) */
  supabaseAnonKey?: string;
  /** Custom domain URL (overrides supabaseUrl for API calls) */
  customDomain?: string;
  /** Default schema (defaults to 'public') */
  schema?: string;
  /** Additional headers to include with all requests */
  headers?: Record<string, string>;
}

/**
 * Create PostgREST client from environment or explicit config
 */
export function createClientFromConfig(
  config: ClientConfig = {},
  token?: string
): PostgRESTClient {
  // Use environment variables as fallback
  const supabaseUrl = config.supabaseUrl || 
    (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
  const supabaseAnonKey = config.supabaseAnonKey || 
    (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined);

  if (!supabaseUrl) {
    throw new Error('Supabase URL is required. Set SUPABASE_URL environment variable or pass supabaseUrl in config.');
  }

  if (!supabaseAnonKey) {
    throw new Error('Supabase anonymous key is required. Set SUPABASE_ANON_KEY environment variable or pass supabaseAnonKey in config.');
  }

  // Use custom domain if provided, otherwise use Supabase URL
  const baseUrl = config.customDomain || supabaseUrl;

  const postgrestConfig: PostgRESTConfig = {
    url: baseUrl,
    anonKey: supabaseAnonKey,
    schema: config.schema,
    token,
    headers: config.headers,
  };

  return createPostgRESTClient(postgrestConfig);
}

/**
 * Default configuration for development
 */
export const defaultConfig: ClientConfig = {
  schema: 'public',
  headers: {
    'User-Agent': 'NVLP-Client/1.0.0',
  },
};

/**
 * Configuration for production with custom domain
 */
export function createProductionConfig(customDomain: string): ClientConfig {
  return {
    ...defaultConfig,
    customDomain,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: ClientConfig): void {
  const supabaseUrl = config.supabaseUrl || 
    (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
  const supabaseAnonKey = config.supabaseAnonKey || 
    (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined);

  if (!supabaseUrl && !config.customDomain) {
    throw new Error('Either supabaseUrl or customDomain must be provided');
  }

  if (!supabaseAnonKey) {
    throw new Error('supabaseAnonKey is required');
  }

  // Validate URL format
  const urlToValidate = config.customDomain || supabaseUrl;
  if (urlToValidate) {
    try {
      new URL(urlToValidate);
    } catch {
      throw new Error(`Invalid URL: ${urlToValidate}`);
    }
  }
}