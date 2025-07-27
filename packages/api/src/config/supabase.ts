import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export class SupabaseService {
  private client: SupabaseClient<Database>;
  private adminClient?: SupabaseClient<Database>;

  constructor(private config: SupabaseConfig) {
    this.client = createClient<Database>(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

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