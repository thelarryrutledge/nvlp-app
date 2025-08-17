declare module 'react-native-config' {
  export interface NativeConfig {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    API_URL?: string;
    API_BASE_URL?: string;
    NODE_ENV?: string;
    APP_ENV?: string;
    DEEP_LINK_SCHEME?: string;
    DEEP_LINK_DOMAIN?: string;
    OAUTH_GOOGLE_CLIENT_ID?: string;
    OAUTH_APPLE_SERVICE_ID?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}