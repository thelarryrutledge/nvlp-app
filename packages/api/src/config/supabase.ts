import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';
import { AuthenticatedClient, AuthenticatedClientOptions } from '../client/authenticated-client';
import { TokenStorage } from '../client/token-storage';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  tokenStorage?: TokenStorage;
  persistSession?: boolean;
}

export class SupabaseService {
  private client: SupabaseClient<Database>;
  private adminClient?: SupabaseClient<Database>;
  private authenticatedClient: AuthenticatedClient;

  constructor(config: SupabaseConfig) {
    this.client = createClient<Database>(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });

    const authClientOptions: AuthenticatedClientOptions = {
      tokenStorage: config.tokenStorage,
      persistSession: config.persistSession,
    };
    
    this.authenticatedClient = new AuthenticatedClient(this.client, authClientOptions);

    if (config.serviceRoleKey) {
      this.adminClient = createClient<Database>(config.url, config.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }

  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  getAdminClient(): SupabaseClient<Database> | undefined {
    return this.adminClient;
  }

  getAuthenticatedClient(): AuthenticatedClient {
    return this.authenticatedClient;
  }

  async setAccessToken(token: string): Promise<void> {
    await this.client.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
  }

  async clearSession(): Promise<void> {
    await this.client.auth.signOut();
  }
}