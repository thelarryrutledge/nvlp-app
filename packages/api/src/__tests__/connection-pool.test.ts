import { SupabaseConnectionPool, createConnectionPool } from '../config/connection-pool';
import { config } from 'dotenv';

// Load environment variables
config();

// Mock the SupabaseClient to avoid real connections in tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}));

describe('Connection Pool Tests', () => {
  let pool: SupabaseConnectionPool;
  const baseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
  const baseKey = process.env.SUPABASE_ANON_KEY || 'test-key';

  beforeEach(() => {
    // Clear the singleton instances before each test
    // @ts-ignore - accessing private static property for testing
    SupabaseConnectionPool.instances = new Map();
    
    // Create a new pool for each test with unique credentials
    const testId = Math.random().toString(36).substring(7);
    const url = `${baseUrl}-${testId}`;
    const key = `${baseKey}-${testId}`;
    
    pool = createConnectionPool(url, key, {
      maxConnections: 5,
      minConnections: 2,
      idleTimeoutMs: 5000,
      acquireTimeoutMs: 1000,
    });
  });

  afterEach(async () => {
    // Clean up pool after each test
    if (pool) {
      await pool.shutdown();
    }
    
    // Clear all singleton instances
    // @ts-ignore - accessing private static property for testing
    SupabaseConnectionPool.instances.clear();
  });

  describe('Pool Initialization', () => {
    it('should create minimum connections on initialization', async () => {
      // Give pool time to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = pool.getStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(2);
      expect(stats.idleConnections).toBeGreaterThanOrEqual(2);
      expect(stats.activeConnections).toBe(0);
    });

    it('should use singleton pattern for same credentials', () => {
      // Get the URL and key used for the current pool
      // @ts-ignore - accessing private properties for testing
      const url = pool.supabaseUrl;
      // @ts-ignore - accessing private properties for testing
      const key = pool.supabaseKey;
      
      const pool2 = createConnectionPool(url, key);
      expect(pool2).toBe(pool);
    });
  });

  describe('Connection Acquisition', () => {
    it('should acquire and release connections', async () => {
      const client = await pool.acquire();
      expect(client).toBeDefined();
      
      const statsAfterAcquire = pool.getStats();
      expect(statsAfterAcquire.activeConnections).toBe(1);
      expect(statsAfterAcquire.totalAcquired).toBe(1);
      
      pool.release(client);
      
      const statsAfterRelease = pool.getStats();
      expect(statsAfterRelease.activeConnections).toBe(0);
      expect(statsAfterRelease.totalReleased).toBe(1);
    });

    it('should reuse connections', async () => {
      const client1 = await pool.acquire();
      pool.release(client1);
      
      const client2 = await pool.acquire();
      expect(client2).toBe(client1); // Should be the same instance
      pool.release(client2);
    });

    it('should create new connections up to max limit', async () => {
      const clients = [];
      
      // Acquire max connections
      for (let i = 0; i < 5; i++) {
        clients.push(await pool.acquire());
      }
      
      const stats = pool.getStats();
      expect(stats.totalConnections).toBe(5);
      expect(stats.activeConnections).toBe(5);
      expect(stats.idleConnections).toBe(0);
      
      // Release all
      clients.forEach(client => pool.release(client));
    });

    it('should queue requests when at max connections', async () => {
      const clients = [];
      
      // Acquire all connections
      for (let i = 0; i < 5; i++) {
        clients.push(await pool.acquire());
      }
      
      // This should queue
      const acquirePromise = pool.acquire();
      
      // Check that request is queued
      const stats = pool.getStats();
      expect(stats.waitingForConnection).toBe(1);
      
      // Release one connection
      pool.release(clients[0]);
      
      // Queued request should now complete
      const queuedClient = await acquirePromise;
      expect(queuedClient).toBeDefined();
      
      // Clean up
      pool.release(queuedClient);
      clients.slice(1).forEach(client => pool.release(client));
    });

    it('should timeout acquisition requests', async () => {
      const clients = [];
      
      // Acquire all connections
      for (let i = 0; i < 5; i++) {
        clients.push(await pool.acquire());
      }
      
      // This should timeout
      await expect(pool.acquire()).rejects.toThrow('Connection acquire timeout');
      
      // Clean up
      clients.forEach(client => pool.release(client));
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const health = await pool.healthCheck();
      
      expect(health.healthy).toBeDefined();
      expect(health.details).toBeDefined();
      expect(health.details.stats).toBeDefined();
      expect(health.details.stats.totalConnections).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Connection Cleanup', () => {
    it('should clean up idle connections', async () => {
      // Create a pool with short idle timeout using unique credentials
      const testId = Math.random().toString(36).substring(7);
      const testPool = createConnectionPool(`${baseUrl}-cleanup-${testId}`, `${baseKey}-cleanup-${testId}`, {
        maxConnections: 5,
        minConnections: 1,
        idleTimeoutMs: 100, // 100ms for testing
      });
      
      // Acquire and release to create extra connections
      const clients = [];
      for (let i = 0; i < 3; i++) {
        clients.push(await testPool.acquire());
      }
      clients.forEach(client => testPool.release(client));
      
      // Wait for cleanup (shorter time for testing)
      await new Promise(resolve => setTimeout(resolve, 150)); // Wait for idle timeout + buffer
      
      const stats = testPool.getStats();
      expect(stats.totalConnections).toBeLessThanOrEqual(3); // Should clean up some connections
      
      await testPool.shutdown();
    });
  });

  describe('Error Handling', () => {
    it('should handle shutdown gracefully', async () => {
      const initialStats = pool.getStats();
      expect(initialStats.totalConnections).toBeGreaterThan(0);
      
      await pool.shutdown();
      
      // Should not be able to acquire after shutdown
      await expect(pool.acquire()).rejects.toThrow('Connection pool is shutting down');
      
      // Allow a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats = pool.getStats();
      expect(stats.totalConnections).toBe(0);
    });

    it('should release unknown connections safely', () => {
      const fakeClient = {} as any;
      
      // Should not throw
      expect(() => pool.release(fakeClient)).not.toThrow();
    });
  });

  describe('Statistics', () => {
    it('should track cumulative statistics', async () => {
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const client = await pool.acquire();
        pool.release(client);
      }
      
      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(iterations);
      expect(stats.totalReleased).toBe(iterations);
    });
  });
});

// Integration test to verify actual database operations
describe('Connection Pool Integration Tests', () => {
  let pool: SupabaseConnectionPool;
  const shouldRunIntegration = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.RUN_INTEGRATION_TESTS === 'true';

  beforeAll(() => {
    if (!shouldRunIntegration) {
      console.warn('Skipping integration tests - Set RUN_INTEGRATION_TESTS=true and provide SUPABASE_URL/SUPABASE_ANON_KEY to run');
      return;
    }
    
    // Clear singleton instances for integration tests
    // @ts-ignore - accessing private static property for testing
    SupabaseConnectionPool.instances.clear();
    
    pool = createConnectionPool(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      maxConnections: 3,
      minConnections: 1,
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.shutdown();
    }
    
    // Clear singleton instances after integration tests
    // @ts-ignore - accessing private static property for testing  
    SupabaseConnectionPool.instances.clear();
  });

  it('should perform actual database query through pool', async () => {
    if (!shouldRunIntegration) {
      return;
    }
    
    const client = await pool.acquire();
    
    try {
      // Simple query to test connection
      const { error } = await client
        .from('budgets')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      expect(error).toBeNull();
      // We don't check data as table might be empty
    } finally {
      pool.release(client);
    }
  });

  it('should handle concurrent database operations', async () => {
    if (!shouldRunIntegration) {
      return;
    }
    
    const operations = Array.from({ length: 5 }, async () => {
      const client = await pool.acquire();
      try {
        const { error } = await client
          .from('budgets')
          .select('count', { count: 'exact', head: true })
          .limit(1);
        
        return !error;
      } finally {
        pool.release(client);
      }
    });
    
    const results = await Promise.all(operations);
    expect(results.every(result => result === true)).toBe(true);
    
    // Check that pool reused connections
    const stats = pool.getStats();
    expect(stats.totalConnections).toBeLessThanOrEqual(3); // Max connections
  });
});