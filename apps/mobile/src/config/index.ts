/**
 * Application configuration from environment variables
 */
export const config = {
  // API Configuration
  api: {
    baseUrl: 'http://localhost:3000',
    dbApiUrl: 'https://db-api.nvlp.app',
    edgeApiUrl: 'https://edge-api.nvlp.app',
  },
  
  // Supabase Configuration
  supabase: {
    url: 'https://qnpatlosomopoimtsmsr.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8',
  },
  
  // App Configuration
  app: {
    env: 'development',
    isProduction: false,
    isDevelopment: true,
    isStaging: false,
    enableLogging: true,
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