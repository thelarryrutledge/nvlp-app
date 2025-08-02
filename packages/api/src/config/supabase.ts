import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';
import { AuthenticatedClient, AuthenticatedClientOptions } from '../client/authenticated-client';
import { TokenStorage } from '../client/token-storage';
import { SupabaseConnectionPool, ConnectionPoolConfig, createConnectionPool } from './connection-pool';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  tokenStorage?: TokenStorage;
  persistSession?: boolean;
  connectionPool?: Partial<ConnectionPoolConfig>;
}

export class SupabaseService {
  private client: SupabaseClient<Database>;
  private adminClient?: SupabaseClient<Database>;
  private authenticatedClient: AuthenticatedClient;
  private connectionPool: SupabaseConnectionPool;
  private adminConnectionPool?: SupabaseConnectionPool;

  constructor(config: SupabaseConfig) {
    // Initialize connection pools
    this.connectionPool = createConnectionPool(config.url, config.anonKey, config.connectionPool);
    
    if (config.serviceRoleKey) {
      this.adminConnectionPool = createConnectionPool(config.url, config.serviceRoleKey, {
        ...config.connectionPool,
        // Admin pool typically needs fewer connections
        maxConnections: config.connectionPool?.maxConnections ?? 5,
        minConnections: config.connectionPool?.minConnections ?? 1,
      });
    }

    // Keep existing client for compatibility
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

  getConnectionPool(): SupabaseConnectionPool {
    return this.connectionPool;
  }

  getAdminConnectionPool(): SupabaseConnectionPool | undefined {
    return this.adminConnectionPool;
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

  async shutdown(): Promise<void> {
    await this.connectionPool.shutdown();
    if (this.adminConnectionPool) {
      await this.adminConnectionPool.shutdown();
    }
  }

  getPoolStats() {
    return {
      main: this.connectionPool.getStats(),
      admin: this.adminConnectionPool?.getStats(),
    };
  }

  async healthCheck() {
    const results = await Promise.allSettled([
      this.connectionPool.healthCheck(),
      this.adminConnectionPool?.healthCheck(),
    ]);

    return {
      main: results[0].status === 'fulfilled' ? results[0].value : { healthy: false, error: results[0].reason },
      admin: results[1] && results[1].status === 'fulfilled' ? results[1].value : undefined,
    };
  }
}