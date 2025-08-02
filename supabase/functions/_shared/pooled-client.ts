/**
 * Shared connection pooling utilities for Supabase Edge Functions
 * 
 * Edge Functions run in isolated environments, so we create a simple
 * connection management system that can be reused across function invocations.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EdgeConnectionPool {
  clients: Map<string, SupabaseClient>;
  lastUsed: Map<string, number>;
  maxAge: number; // Maximum age in milliseconds
  maxSize: number; // Maximum number of cached clients
}

// Global pool for Edge Function environment
const globalPool: EdgeConnectionPool = {
  clients: new Map(),
  lastUsed: new Map(),
  maxAge: 30 * 60 * 1000, // 30 minutes
  maxSize: 10,
};

/**
 * Get or create a pooled Supabase client for Edge Functions
 */
export function getPooledClient(token: string): SupabaseClient {
  const now = Date.now();
  
  // Clean up expired clients
  cleanupExpiredClients(now);
  
  // Check if we have a cached client for this token
  const clientKey = hashToken(token);
  const existingClient = globalPool.clients.get(clientKey);
  
  if (existingClient) {
    // Update last used time
    globalPool.lastUsed.set(clientKey, now);
    return existingClient;
  }
  
  // Create new client
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
          'Connection': 'keep-alive',
        }
      }
    }
  );
  
  // Add to pool if we have space
  if (globalPool.clients.size < globalPool.maxSize) {
    globalPool.clients.set(clientKey, client);
    globalPool.lastUsed.set(clientKey, now);
  }
  
  return client;
}

/**
 * Create a simple hash of the token for cache key
 */
function hashToken(token: string): string {
  // Simple hash function for demo - in production use a proper hash
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Clean up expired clients from the pool
 */
function cleanupExpiredClients(now: number): void {
  const keysToDelete: string[] = [];
  
  for (const [key, lastUsed] of globalPool.lastUsed.entries()) {
    if (now - lastUsed > globalPool.maxAge) {
      keysToDelete.push(key);
    }
  }
  
  for (const key of keysToDelete) {
    globalPool.clients.delete(key);
    globalPool.lastUsed.delete(key);
  }
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  const now = Date.now();
  const activeClients = Array.from(globalPool.lastUsed.values())
    .filter(lastUsed => now - lastUsed < 5 * 60 * 1000) // Active in last 5 minutes
    .length;
  
  return {
    totalClients: globalPool.clients.size,
    activeClients,
    idleClients: globalPool.clients.size - activeClients,
    maxSize: globalPool.maxSize,
    maxAge: globalPool.maxAge,
  };
}

/**
 * Utility function for Edge Functions to handle database operations with pooling
 */
export async function withPooledClient<T>(
  req: Request,
  operation: (client: SupabaseClient) => Promise<T>
): Promise<T> {
  // Extract token from request
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const client = getPooledClient(token);
  
  // Execute operation
  return await operation(client);
}

/**
 * Health check for the Edge Function connection pool
 */
export async function poolHealthCheck(): Promise<{ healthy: boolean; stats: any; error?: string }> {
  try {
    const stats = getPoolStats();
    
    // Simple health check - ensure pool is not at max capacity
    const healthy = stats.totalClients < stats.maxSize;
    
    return {
      healthy,
      stats,
    };
  } catch (error) {
    return {
      healthy: false,
      stats: getPoolStats(),
      error: (error as Error).message,
    };
  }
}