import Config from 'react-native-config';

/**
 * Application configuration from environment variables
 */
export const config = {
  // API Configuration
  api: {
    baseUrl: Config.API_URL || 'http://localhost:3000',
    dbApiUrl: Config.DB_API_URL || 'https://db-api.nvlp.app',
    edgeApiUrl: Config.EDGE_API_URL || 'https://edge-api.nvlp.app',
  },
  
  // Supabase Configuration
  supabase: {
    url: Config.SUPABASE_URL || '',
    anonKey: Config.SUPABASE_ANON_KEY || '',
  },
  
  // App Configuration
  app: {
    env: Config.APP_ENV || 'development',
    isProduction: Config.APP_ENV === 'production',
    isDevelopment: Config.APP_ENV === 'development',
    isStaging: Config.APP_ENV === 'staging',
    enableLogging: Config.ENABLE_LOGGING === 'true',
  },
} as const;

/**
 * Helper to check if we're in development mode
 */
export const isDev = () => config.app.isDevelopment;

/**
 * Helper to check if we're in production mode
 */
export const isProd = () => config.app.isProduction;

/**
 * Helper to check if logging is enabled
 */
export const isLoggingEnabled = () => config.app.enableLogging;

/**
 * Log a message if logging is enabled
 */
export const log = (...args: any[]) => {
  if (isLoggingEnabled()) {
    console.log('[NVLP]', ...args);
  }
};

/**
 * Log an error if logging is enabled
 */
export const logError = (...args: any[]) => {
  if (isLoggingEnabled()) {
    console.error('[NVLP Error]', ...args);
  }
};