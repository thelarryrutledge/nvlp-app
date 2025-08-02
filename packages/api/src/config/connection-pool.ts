import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  acquireTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingForConnection: number;
  totalAcquired: number;
  totalReleased: number;
  totalCreated: number;
  totalDestroyed: number;
}

interface PooledConnection {
  client: SupabaseClient<Database>;
  id: string;
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
  useCount: number;
}

interface PendingRequest {
  resolve: (client: SupabaseClient<Database>) => void;
  reject: (error: Error) => void;
  requestedAt: number;
}

export class SupabaseConnectionPool {
  private static instances = new Map<string, SupabaseConnectionPool>();
  
  private connections: PooledConnection[] = [];
  private pendingRequests: PendingRequest[] = [];
  private config: ConnectionPoolConfig;
  private supabaseUrl: string;
  private supabaseKey: string;
  private isShuttingDown = false;
  private cleanupInterval?: NodeJS.Timeout;
  private stats: ConnectionPoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingForConnection: 0,
    totalAcquired: 0,
    totalReleased: 0,
    totalCreated: 0,
    totalDestroyed: 0,
  };

  private constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.config = {
      maxConnections: config.maxConnections ?? 10,
      minConnections: config.minConnections ?? 2,
      idleTimeoutMs: config.idleTimeoutMs ?? 30000, // 30 seconds
      acquireTimeoutMs: config.acquireTimeoutMs ?? 5000, // 5 seconds
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 100,
    };

    this.initializeMinConnections();
    this.startCleanupInterval();
  }

  static getInstance(
    supabaseUrl: string,
    supabaseKey: string,
    config?: Partial<ConnectionPoolConfig>
  ): SupabaseConnectionPool {
    const key = `${supabaseUrl}:${supabaseKey}`;
    
    if (!SupabaseConnectionPool.instances.has(key)) {
      SupabaseConnectionPool.instances.set(
        key,
        new SupabaseConnectionPool(supabaseUrl, supabaseKey, config)
      );
    }
    
    return SupabaseConnectionPool.instances.get(key)!;
  }

  private async initializeMinConnections(): Promise<void> {
    const promises = Array.from({ length: this.config.minConnections }, () =>
      this.createConnection()
    );
    
    await Promise.allSettled(promises);
  }

  private createConnection(): PooledConnection {
    const client = createClient<Database>(this.supabaseUrl, this.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'Connection': 'keep-alive',
        },
      },
      db: {
        schema: 'public',
      },
    });

    const connection: PooledConnection = {
      client,
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      isActive: false,
      useCount: 0,
    };

    this.connections.push(connection);
    this.stats.totalCreated++;
    this.updateStats();
    
    return connection;
  }

  private destroyConnection(connection: PooledConnection): void {
    const index = this.connections.indexOf(connection);
    if (index !== -1) {
      this.connections.splice(index, 1);
      this.stats.totalDestroyed++;
      this.updateStats();
    }
  }

  private updateStats(): void {
    this.stats.totalConnections = this.connections.length;
    this.stats.activeConnections = this.connections.filter(c => c.isActive).length;
    this.stats.idleConnections = this.connections.filter(c => !c.isActive).length;
    this.stats.waitingForConnection = this.pendingRequests.length;
  }

  async acquire(): Promise<SupabaseClient<Database>> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    return new Promise((resolve, reject) => {
      const attemptAcquire = () => {
        // Try to find an idle connection
        const idleConnection = this.connections.find(c => !c.isActive);
        
        if (idleConnection) {
          idleConnection.isActive = true;
          idleConnection.lastUsedAt = Date.now();
          idleConnection.useCount++;
          this.stats.totalAcquired++;
          this.updateStats();
          resolve(idleConnection.client);
          return;
        }

        // Create new connection if under max limit
        if (this.connections.length < this.config.maxConnections) {
          try {
            const newConnection = this.createConnection();
            newConnection.isActive = true;
            newConnection.useCount++;
            this.stats.totalAcquired++;
            this.updateStats();
            resolve(newConnection.client);
            return;
          } catch (error) {
            reject(new Error(`Failed to create new connection: ${error}`));
            return;
          }
        }

        // Queue request if at max connections
        this.pendingRequests.push({
          resolve,
          reject,
          requestedAt: Date.now(),
        });
        this.updateStats();

        // Set timeout for request
        setTimeout(() => {
          const requestIndex = this.pendingRequests.findIndex(r => r.resolve === resolve);
          if (requestIndex !== -1) {
            this.pendingRequests.splice(requestIndex, 1);
            this.updateStats();
            reject(new Error('Connection acquire timeout'));
          }
        }, this.config.acquireTimeoutMs);
      };

      attemptAcquire();
    });
  }

  release(client: SupabaseClient<Database>): void {
    const connection = this.connections.find(c => c.client === client);
    
    if (!connection) {
      console.warn('Attempted to release unknown connection');
      return;
    }

    connection.isActive = false;
    connection.lastUsedAt = Date.now();
    this.stats.totalReleased++;
    this.updateStats();

    // Process pending requests
    if (this.pendingRequests.length > 0) {
      const pendingRequest = this.pendingRequests.shift()!;
      connection.isActive = true;
      connection.useCount++;
      this.stats.totalAcquired++;
      this.updateStats();
      pendingRequest.resolve(connection.client);
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
      this.cleanupTimedOutRequests();
    }, 10000); // Run cleanup every 10 seconds
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToDestroy = this.connections.filter(
      c => !c.isActive && 
           (now - c.lastUsedAt) > this.config.idleTimeoutMs &&
           this.connections.length > this.config.minConnections
    );

    connectionsToDestroy.forEach(connection => {
      this.destroyConnection(connection);
    });
  }

  private cleanupTimedOutRequests(): void {
    const now = Date.now();
    const timedOutRequests = this.pendingRequests.filter(
      r => (now - r.requestedAt) > this.config.acquireTimeoutMs
    );

    timedOutRequests.forEach(request => {
      const index = this.pendingRequests.indexOf(request);
      if (index !== -1) {
        this.pendingRequests.splice(index, 1);
        request.reject(new Error('Connection request timed out'));
      }
    });

    this.updateStats();
  }

  getStats(): ConnectionPoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Reject all pending requests
    this.pendingRequests.forEach(request => {
      request.reject(new Error('Connection pool shutting down'));
    });
    this.pendingRequests = [];

    // Close all connections
    this.connections.forEach(connection => {
      this.destroyConnection(connection);
    });

    this.updateStats();
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const client = await this.acquire();
      
      // Simple health check query
      const { data, error } = await client
        .from('budgets')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      this.release(client);
      
      return {
        healthy: !error,
        details: {
          stats: this.getStats(),
          testQuery: { success: !error, error: error?.message },
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          stats: this.getStats(),
          error: (error as Error).message,
        },
      };
    }
  }
}

// Convenience function for creating connection pools
export function createConnectionPool(
  supabaseUrl: string,
  supabaseKey: string,
  config?: Partial<ConnectionPoolConfig>
): SupabaseConnectionPool {
  return SupabaseConnectionPool.getInstance(supabaseUrl, supabaseKey, config);
}