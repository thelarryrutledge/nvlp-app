#!/usr/bin/env node

import { createConnectionPool } from '../packages/api/src/config/connection-pool';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

async function testConnectionPool() {
  console.log('🔍 Testing Connection Pool Implementation\n');
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    process.exit(1);
  }
  
  console.log('✅ Environment variables loaded');
  console.log(`📍 Supabase URL: ${url}`);
  console.log(`🔑 Using anon key: ${key.substring(0, 20)}...`);
  
  // Create connection pool
  console.log('\n📊 Creating connection pool...');
  const pool = createConnectionPool(url, key, {
    maxConnections: 5,
    minConnections: 2,
    idleTimeoutMs: 30000,
    acquireTimeoutMs: 5000,
  });
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check initial stats
  console.log('\n📈 Initial Pool Statistics:');
  let stats = pool.getStats();
  console.table(stats);
  
  try {
    // Test 1: Basic acquire and release
    console.log('\n🧪 Test 1: Basic Connection Acquire/Release');
    const client1 = await pool.acquire();
    console.log('✅ Acquired connection');
    
    stats = pool.getStats();
    console.log(`   Active connections: ${stats.activeConnections}`);
    console.log(`   Idle connections: ${stats.idleConnections}`);
    
    // Test database query
    const { error } = await client1
      .from('budgets')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`⚠️  Database query error: ${error.message}`);
    } else {
      console.log('✅ Database query successful');
    }
    
    pool.release(client1);
    console.log('✅ Released connection');
    
    // Test 2: Connection reuse
    console.log('\n🧪 Test 2: Connection Reuse');
    const client2 = await pool.acquire();
    const client3 = await pool.acquire();
    
    console.log(`✅ Acquired 2 connections`);
    stats = pool.getStats();
    console.log(`   Total connections: ${stats.totalConnections}`);
    console.log(`   Active connections: ${stats.activeConnections}`);
    
    pool.release(client2);
    pool.release(client3);
    
    // Test 3: Concurrent operations
    console.log('\n🧪 Test 3: Concurrent Operations');
    const startTime = Date.now();
    
    const operations = Array.from({ length: 10 }, async (_, i) => {
      const client = await pool.acquire();
      try {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 100));
        return `Operation ${i + 1} completed`;
      } finally {
        pool.release(client);
      }
    });
    
    const results = await Promise.all(operations);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Completed ${results.length} operations in ${duration}ms`);
    console.log(`   Average time per operation: ${(duration / results.length).toFixed(2)}ms`);
    
    stats = pool.getStats();
    console.log(`   Peak connections used: ${stats.totalConnections}`);
    console.log(`   Total acquisitions: ${stats.totalAcquired}`);
    console.log(`   Total releases: ${stats.totalReleased}`);
    
    // Test 4: Health check
    console.log('\n🧪 Test 4: Health Check');
    const health = await pool.healthCheck();
    console.log(`✅ Health check completed`);
    console.log(`   Healthy: ${health.healthy}`);
    console.log(`   Current stats:`, health.details.stats);
    
    // Test 5: Connection limit
    console.log('\n🧪 Test 5: Connection Limit & Queueing');
    const clients = [];
    
    // Acquire all available connections
    for (let i = 0; i < 5; i++) {
      clients.push(await pool.acquire());
    }
    console.log('✅ Acquired all 5 connections (max limit)');
    
    stats = pool.getStats();
    console.log(`   Idle connections: ${stats.idleConnections}`);
    console.log(`   Waiting for connection: ${stats.waitingForConnection}`);
    
    // Try to acquire one more (should queue)
    console.log('⏳ Attempting to acquire 6th connection (should queue)...');
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Expected timeout')), 1000)
    );
    
    const acquirePromise = pool.acquire();
    
    // Should timeout since all connections are in use
    try {
      await Promise.race([acquirePromise, timeoutPromise]);
      console.log('❌ Unexpected: Connection acquired when pool was full');
    } catch (error) {
      console.log('✅ Correctly queued/timed out when pool was full');
    }
    
    // Release all connections
    clients.forEach(client => pool.release(client));
    console.log('✅ Released all connections');
    
    // Final stats
    console.log('\n📊 Final Pool Statistics:');
    stats = pool.getStats();
    console.table(stats);
    
    // Performance summary
    console.log('\n🎯 Performance Summary:');
    console.log(`   Total connections created: ${stats.totalCreated}`);
    console.log(`   Total connections destroyed: ${stats.totalDestroyed}`);
    console.log(`   Connection reuse rate: ${((stats.totalAcquired - stats.totalCreated) / stats.totalAcquired * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Shutting down pool...');
    await pool.shutdown();
    console.log('✅ Pool shutdown complete');
  }
  
  console.log('\n✨ Connection pool tests completed!');
}

// Run the test
testConnectionPool().catch(console.error);