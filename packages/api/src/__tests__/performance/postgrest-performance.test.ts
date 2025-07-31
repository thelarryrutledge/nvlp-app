/**
 * PostgREST Performance Tests
 * 
 * This test suite measures the performance of direct PostgREST access
 * and compares it with Edge Functions for various operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';
import {
  createPostgRESTHeaders,
  createEnhancedPostgRESTClient,
  PostgRESTPrefer,
} from '../../utils';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-key';
const PERFORMANCE_ITERATIONS = 10;
const TIMEOUT_MS = 30000;

describe('PostgREST Performance Tests', () => {
  let supabaseClient: SupabaseClient<Database>;
  let postgrestClient: ReturnType<typeof createEnhancedPostgRESTClient>;
  let testBudgetId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create clients
    supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    postgrestClient = createEnhancedPostgRESTClient({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      supabaseClient,
      schema: 'public',
    });

    // Create test user and budget (or use existing)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      // Skip tests if no authentication
      console.warn('Skipping performance tests - no authenticated user');
      return;
    }

    testUserId = user.id;

    // Get or create test budget
    const { data: budgets } = await supabaseClient
      .from('budgets')
      .select('id')
      .eq('user_id', testUserId)
      .limit(1);

    if (budgets && budgets.length > 0) {
      testBudgetId = budgets[0].id;
    } else {
      // Create test budget
      const { data: newBudget } = await supabaseClient
        .from('budgets')
        .insert({
          name: 'Performance Test Budget',
          description: 'Budget for performance testing',
          user_id: testUserId,
        })
        .select('id')
        .single();

      if (newBudget) {
        testBudgetId = newBudget.id;
      }
    }
  }, TIMEOUT_MS);

  /**
   * Utility function to measure execution time
   */
  async function measureTime<T>(
    operation: () => Promise<T>,
    iterations: number = PERFORMANCE_ITERATIONS
  ): Promise<{ averageMs: number; minMs: number; maxMs: number; results: T[] }> {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        const result = await operation();
        results.push(result);
      } catch (error) {
        console.error(`Iteration ${i} failed:`, error);
        throw error;
      }
      const end = performance.now();
      times.push(end - start);

      // Small delay between iterations to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return {
      averageMs: times.reduce((a, b) => a + b, 0) / times.length,
      minMs: Math.min(...times),
      maxMs: Math.max(...times),
      results,
    };
  }

  describe('Basic CRUD Operations', () => {
    it('should measure SELECT performance', async () => {
      if (!testBudgetId) {
        console.warn('Skipping SELECT test - no test budget');
        return;
      }

      // Test direct PostgREST SELECT
      const postgrestPerf = await measureTime(async () => {
        const { data, error } = await postgrestClient.select('budgets', {
          filters: { 'user_id': `eq.${testUserId}` },
          limit: 10,
        });
        if (error) throw error;
        return data;
      });

      // Test Supabase client SELECT
      const supabasePerf = await measureTime(async () => {
        const { data, error } = await supabaseClient
          .from('budgets')
          .select('*')
          .eq('user_id', testUserId)
          .limit(10);
        if (error) throw error;
        return data;
      });

      console.log(`SELECT Performance:
        PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms avg (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)
        Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms avg (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);

      expect(postgrestPerf.averageMs).toBeGreaterThan(0);
      expect(supabasePerf.averageMs).toBeGreaterThan(0);
    }, TIMEOUT_MS);

    it('should measure INSERT performance', async () => {
      if (!testBudgetId) {
        console.warn('Skipping INSERT test - no test budget');
        return;
      }

      // Test direct PostgREST INSERT
      const postgrestPerf = await measureTime(async () => {
        const { data, error } = await postgrestClient.insert('categories', {
          budget_id: testBudgetId,
          name: `Test Category ${Date.now()}-${Math.random()}`,
          is_income: false,
          display_order: 1,
        });
        if (error) throw error;
        return data;
      });

      // Test Supabase client INSERT
      const supabasePerf = await measureTime(async () => {
        const { data, error } = await supabaseClient
          .from('categories')
          .insert({
            budget_id: testBudgetId,
            name: `Test Category ${Date.now()}-${Math.random()}`,
            is_income: false,
            display_order: 1,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      });

      console.log(`INSERT Performance:
        PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms avg (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)
        Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms avg (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);

      expect(postgrestPerf.averageMs).toBeGreaterThan(0);
      expect(supabasePerf.averageMs).toBeGreaterThan(0);
    }, TIMEOUT_MS);

    it('should measure UPDATE performance', async () => {
      if (!testBudgetId) {
        console.warn('Skipping UPDATE test - no test budget');
        return;
      }

      // Create test categories first
      const { data: testCategory } = await supabaseClient
        .from('categories')
        .insert({
          budget_id: testBudgetId,
          name: 'Update Test Category',
          is_income: false,
          display_order: 1,
        })
        .select()
        .single();

      if (!testCategory) {
        console.warn('Failed to create test category for UPDATE test');
        return;
      }

      // Test direct PostgREST UPDATE
      const postgrestPerf = await measureTime(async () => {
        const { data, error } = await postgrestClient.update(
          'categories',
          { description: `Updated at ${Date.now()}` },
          { 'id': `eq.${testCategory.id}` }
        );
        if (error) throw error;
        return data;
      });

      // Test Supabase client UPDATE
      const supabasePerf = await measureTime(async () => {
        const { data, error } = await supabaseClient
          .from('categories')
          .update({ description: `Updated at ${Date.now()}` })
          .eq('id', testCategory.id)
          .select();
        if (error) throw error;
        return data;
      });

      console.log(`UPDATE Performance:
        PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms avg (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)
        Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms avg (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);

      expect(postgrestPerf.averageMs).toBeGreaterThan(0);
      expect(supabasePerf.averageMs).toBeGreaterThan(0);
    }, TIMEOUT_MS);
  });

  describe('Complex Query Performance', () => {
    it('should measure JOIN query performance', async () => {
      if (!testBudgetId) {
        console.warn('Skipping JOIN test - no test budget');
        return;
      }

      // Test direct PostgREST with embedded resources
      const postgrestPerf = await measureTime(async () => {
        const { data, error } = await postgrestClient.select('envelopes', {
          columns: '*,category:categories(name,is_income)',
          filters: { 'budget_id': `eq.${testBudgetId}` },
          limit: 20,
        });
        if (error) throw error;
        return data;
      });

      // Test Supabase client with embedded resources
      const supabasePerf = await measureTime(async () => {
        const { data, error } = await supabaseClient
          .from('envelopes')
          .select('*,category:categories(name,is_income)')
          .eq('budget_id', testBudgetId)
          .limit(20);
        if (error) throw error;
        return data;
      });

      console.log(`JOIN Query Performance:
        PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms avg (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)
        Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms avg (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);

      expect(postgrestPerf.averageMs).toBeGreaterThan(0);
      expect(supabasePerf.averageMs).toBeGreaterThan(0);
    }, TIMEOUT_MS);

    it('should measure COUNT query performance', async () => {
      if (!testBudgetId) {
        console.warn('Skipping COUNT test - no test budget');
        return;
      }

      // Test direct PostgREST with count
      const postgrestPerf = await measureTime(async () => {
        const { data, error, count } = await postgrestClient.select('transactions', {
          filters: { 'budget_id': `eq.${testBudgetId}` },
          limit: 1,
          count: 'exact',
        });
        if (error) throw error;
        return { data, count };
      });

      // Test Supabase client with count
      const supabasePerf = await measureTime(async () => {
        const { data, error, count } = await supabaseClient
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('budget_id', testBudgetId)
          .limit(1);
        if (error) throw error;
        return { data, count };
      });

      console.log(`COUNT Query Performance:
        PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms avg (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)
        Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms avg (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);

      expect(postgrestPerf.averageMs).toBeGreaterThan(0);
      expect(supabasePerf.averageMs).toBeGreaterThan(0);
    }, TIMEOUT_MS);

    it('should measure pagination performance', async () => {
      if (!testBudgetId) {
        console.warn('Skipping pagination test - no test budget');
        return;
      }

      // Test direct PostgREST with range
      const postgrestPerf = await measureTime(async () => {
        const session = await supabaseClient.auth.getSession();
        const headers = createPostgRESTHeaders(SUPABASE_ANON_KEY, session.data.session, {
          range: { from: 0, to: 19 },
        });

        const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?budget_id=eq.${testBudgetId}`, {
          headers: headers as Record<string, string>,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        return response.json();
      });

      // Test Supabase client with range
      const supabasePerf = await measureTime(async () => {
        const { data, error } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('budget_id', testBudgetId)
          .range(0, 19);
        if (error) throw error;
        return data;
      });

      console.log(`Pagination Performance:
        PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms avg (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)
        Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms avg (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);

      expect(postgrestPerf.averageMs).toBeGreaterThan(0);
      expect(supabasePerf.averageMs).toBeGreaterThan(0);
    }, TIMEOUT_MS);
  });

  describe('Bulk Operations Performance', () => {
    it('should measure bulk INSERT performance', async () => {
      if (!testBudgetId) {
        console.warn('Skipping bulk INSERT test - no test budget');
        return;
      }

      const bulkData = Array.from({ length: 10 }, (_, i) => ({
        budget_id: testBudgetId,
        name: `Bulk Category ${i}`,
        is_income: false,
        display_order: i,
      }));

      // Test direct PostgREST bulk insert
      const postgrestPerf = await measureTime(async () => {
        const { data, error } = await postgrestClient.insert('categories', bulkData);
        if (error) throw error;
        return data;
      });

      // Test Supabase client bulk insert
      const supabasePerf = await measureTime(async () => {
        const { data, error } = await supabaseClient
          .from('categories')
          .insert(bulkData)
          .select();
        if (error) throw error;
        return data;
      });

      console.log(`Bulk INSERT Performance (10 records):
        PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms avg (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)
        Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms avg (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);

      expect(postgrestPerf.averageMs).toBeGreaterThan(0);
      expect(supabasePerf.averageMs).toBeGreaterThan(0);
    }, TIMEOUT_MS);

    it('should measure bulk UPDATE performance', async () => {
      if (!testBudgetId) {
        console.warn('Skipping bulk UPDATE test - no test budget');
        return;
      }

      // Test direct PostgREST bulk update
      const postgrestPerf = await measureTime(async () => {
        const { data, error } = await postgrestClient.update(
          'categories',
          { description: `Bulk updated at ${Date.now()}` },
          { 
            'budget_id': `eq.${testBudgetId}`,
            'name': 'like.Bulk Category*'
          }
        );
        if (error) throw error;
        return data;
      });

      // Test Supabase client bulk update
      const supabasePerf = await measureTime(async () => {
        const { data, error } = await supabaseClient
          .from('categories')
          .update({ description: `Bulk updated at ${Date.now()}` })
          .eq('budget_id', testBudgetId)
          .like('name', 'Bulk Category%')
          .select();
        if (error) throw error;
        return data;
      });

      console.log(`Bulk UPDATE Performance:
        PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms avg (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)
        Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms avg (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);

      expect(postgrestPerf.averageMs).toBeGreaterThan(0);
      expect(supabasePerf.averageMs).toBeGreaterThan(0);
    }, TIMEOUT_MS);
  });

  describe('Auth Header Overhead', () => {
    it('should measure auth header creation overhead', async () => {
      const session = (await supabaseClient.auth.getSession()).data.session;
      
      if (!session) {
        console.warn('Skipping auth overhead test - no session');
        return;
      }

      // Measure header creation time
      const headerPerf = await measureTime(async () => {
        return createPostgRESTHeaders(SUPABASE_ANON_KEY, session, {
          prefer: PostgRESTPrefer.RETURN_REPRESENTATION,
          contentProfile: 'public',
          acceptProfile: 'public',
        });
      }, 1000); // More iterations for micro-benchmarks

      console.log(`Auth Header Creation Performance:
        Average: ${headerPerf.averageMs.toFixed(4)}ms
        Min: ${headerPerf.minMs.toFixed(4)}ms
        Max: ${headerPerf.maxMs.toFixed(4)}ms`);

      expect(headerPerf.averageMs).toBeLessThan(1); // Should be very fast
    }, TIMEOUT_MS);
  });

  afterAll(async () => {
    // Clean up test data
    if (testBudgetId) {
      try {
        // Delete test categories
        await supabaseClient
          .from('categories')
          .delete()
          .eq('budget_id', testBudgetId)
          .like('name', '%Test%');

        // Optionally delete test budget if it was created for testing
        // await supabaseClient.from('budgets').delete().eq('id', testBudgetId);
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    }
  });
});