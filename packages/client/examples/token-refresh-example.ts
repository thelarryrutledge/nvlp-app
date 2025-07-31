/**
 * Example of using HttpClient with automatic token refresh
 */

import { createHttpClient, TokenProvider } from '../src/http-client';

// Example token provider implementation
class SupabaseTokenProvider implements TokenProvider {
  private currentToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private supabaseClient: any, // In real usage, this would be typed as SupabaseClient
  ) {}

  async getToken(): Promise<string | null> {
    const { data: { session } } = await this.supabaseClient.auth.getSession();
    if (session?.access_token) {
      this.currentToken = session.access_token;
      this.tokenExpiry = session.expires_at * 1000; // Convert to milliseconds
      return session.access_token;
    }
    return null;
  }

  async refreshToken(): Promise<string> {
    const { data: { session }, error } = await this.supabaseClient.auth.refreshSession();
    
    if (error || !session?.access_token) {
      throw new Error(`Failed to refresh token: ${error?.message || 'No session'}`);
    }

    this.currentToken = session.access_token;
    this.tokenExpiry = session.expires_at * 1000; // Convert to milliseconds
    
    return session.access_token;
  }

  isTokenExpired(token: string): boolean {
    // If we don't have expiry info, assume it's not expired (will rely on server response)
    if (!this.tokenExpiry) return false;
    
    // Add 5 minute buffer to refresh before actual expiry
    const bufferMs = 5 * 60 * 1000;
    return Date.now() > (this.tokenExpiry - bufferMs);
  }
}

// Example usage
export async function demonstrateTokenRefresh(supabaseClient: any) {
  // Create token provider
  const tokenProvider = new SupabaseTokenProvider(supabaseClient);

  // Create HTTP client with token provider
  const httpClient = createHttpClient({
    baseUrl: 'https://your-api.com',
    tokenProvider,
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
  });

  try {
    // This request will automatically include the Bearer token
    // and refresh it if it's expired or if the server returns 401
    const budgets = await httpClient.get('/budgets');
    console.log('Budgets:', budgets);

    // Create a new budget - token will be automatically refreshed if needed
    const newBudget = await httpClient.post('/budgets', {
      name: 'My New Budget',
      description: 'Created with auto token refresh',
    });
    console.log('Created budget:', newBudget);

  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Example of manually configuring token provider after client creation
export function configureTokenProviderLater(httpClient: any, supabaseClient: any) {
  const tokenProvider = new SupabaseTokenProvider(supabaseClient);
  httpClient.setTokenProvider(tokenProvider);
  
  // Now all requests will use automatic token refresh
}

// Example of clearing token provider (for logout)
export function clearTokenProvider(httpClient: any) {
  httpClient.clearTokenProvider();
  // Now requests will not include Authorization header
}