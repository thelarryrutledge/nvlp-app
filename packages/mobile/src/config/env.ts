import Config from 'react-native-config';

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  API_URL: string;
  API_BASE_URL: string;
  NODE_ENV: string;
  APP_ENV: string;
  DEEP_LINK_SCHEME: string;
  DEEP_LINK_DOMAIN: string;
  OAUTH_GOOGLE_CLIENT_ID: string;
  OAUTH_APPLE_SERVICE_ID: string;
}

// Type-safe environment configuration
export const env: EnvConfig = {
  SUPABASE_URL: Config.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: Config.SUPABASE_SERVICE_ROLE_KEY || '',
  API_URL: Config.API_URL || 'http://localhost:3000',
  API_BASE_URL: Config.API_BASE_URL || 'http://localhost:3000',
  NODE_ENV: Config.NODE_ENV || 'development',
  APP_ENV: Config.APP_ENV || 'development',
  DEEP_LINK_SCHEME: Config.DEEP_LINK_SCHEME || 'nvlp',
  DEEP_LINK_DOMAIN: Config.DEEP_LINK_DOMAIN || 'nvlp.app',
  OAUTH_GOOGLE_CLIENT_ID: Config.OAUTH_GOOGLE_CLIENT_ID || '',
  OAUTH_APPLE_SERVICE_ID: Config.OAUTH_APPLE_SERVICE_ID || '',
};

// Validate required environment variables
export const validateEnv = (): void => {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const;
  
  for (const varName of requiredVars) {
    if (!env[varName]) {
      console.warn(`Missing required environment variable: ${varName}`);
    }
  }
};

export default env;