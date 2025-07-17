declare module 'react-native-config' {
  export interface NativeConfig {
    // API Configuration
    API_URL: string;
    DB_API_URL: string;
    EDGE_API_URL: string;
    
    // Supabase Configuration
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    
    // App Configuration
    APP_ENV: 'development' | 'staging' | 'production';
    ENABLE_LOGGING: string;
  }

  export const Config: NativeConfig;
  export default Config;
}