#!/usr/bin/env tsx

/**
 * PostgREST Performance Benchmark Script
 * 
 * This script benchmarks PostgREST performance against Supabase client
 * and provides detailed performance metrics.
 * 
 * Usage: tsx packages/api/scripts/benchmark-postgrest.ts
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';
import {
  createPostgRESTHeaders,
  createEnhancedPostgRESTClient,
  PostgRESTPrefer,
} from '../src/utils';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const ITERATIONS = 20;
const WARMUP_ITERATIONS = 5;

interface BenchmarkResult {
  operation: string;
  postgrestMs: number;
  supabaseMs: number;
  improvement: number;
  postgrestRange: [number, number];
  supabaseRange: [number, number];
}

class PerformanceBenchmark {
  private supabaseClient: ReturnType<typeof createClient<Database>>;
  private postgrestClient: ReturnType<typeof createEnhancedPostgRESTClient>;
  private results: BenchmarkResult[] = [];

  constructor() {
    this.supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.postgrestClient = createEnhancedPostgRESTClient({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      supabaseClient: this.supabaseClient,
      schema: 'public',
    });
  }

  async measureTime<T>(
    operation: () => Promise<T>,
    iterations: number = ITERATIONS
  ): Promise<{ averageMs: number; minMs: number; maxMs: number; results: T[] }> {
    const times: number[] = [];
    const results: T[] = [];

    // Warmup
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      try {
        await operation();
      } catch (error) {
        console.warn(`Warmup iteration ${i} failed:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Actual measurements
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

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      averageMs: times.reduce((a, b) => a + b, 0) / times.length,
      minMs: Math.min(...times),
      maxMs: Math.max(...times),
      results,
    };
  }

  async benchmarkOperation(
    name: string,
    postgrestOp: () => Promise<any>,
    supabaseOp: () => Promise<any>
  ): Promise<void> {
    console.log(`\n🔄 Benchmarking ${name}...`);

    const [postgrestPerf, supabasePerf] = await Promise.all([
      this.measureTime(postgrestOp),
      this.measureTime(supabaseOp),
    ]);

    const improvement = ((supabasePerf.averageMs - postgrestPerf.averageMs) / supabasePerf.averageMs) * 100;

    const result: BenchmarkResult = {
      operation: name,
      postgrestMs: postgrestPerf.averageMs,
      supabaseMs: supabasePerf.averageMs,
      improvement,
      postgrestRange: [postgrestPerf.minMs, postgrestPerf.maxMs],
      supabaseRange: [supabasePerf.minMs, supabasePerf.maxMs],
    };

    this.results.push(result);

    const betterOption = improvement > 0 ? 'PostgREST' : 'Supabase';
    const performanceDiff = Math.abs(improvement).toFixed(1);

    console.log(`   PostgREST: ${postgrestPerf.averageMs.toFixed(2)}ms (${postgrestPerf.minMs.toFixed(2)}-${postgrestPerf.maxMs.toFixed(2)}ms)`);
    console.log(`   Supabase:  ${supabasePerf.averageMs.toFixed(2)}ms (${supabasePerf.minMs.toFixed(2)}-${supabasePerf.maxMs.toFixed(2)}ms)`);
    console.log(`   Winner: ${betterOption} (${performanceDiff}% ${improvement > 0 ? 'faster' : 'slower'})`);
  }

  async run(): Promise<void> {
    console.log('🚀 Starting PostgREST Performance Benchmark');
    console.log(`📊 Configuration: ${ITERATIONS} iterations, ${WARMUP_ITERATIONS} warmup`);
    console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);

    try {
      // Authenticate first
      const { data: { user }, error: authError } = await this.supabaseClient.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Authentication required for benchmarks');
        console.log('Please set up authentication or use service role key');
        return;
      }

      console.log(`👤 Authenticated as: ${user.email || user.id}`);

      // Get or create test budget
      let testBudgetId: string;
      const { data: budgets } = await this.supabaseClient
        .from('budgets')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (budgets && budgets.length > 0) {
        testBudgetId = budgets[0].id;
        console.log(`📁 Using existing budget: ${testBudgetId}`);
      } else {
        const { data: newBudget } = await this.supabaseClient
          .from('budgets')
          .insert({
            name: 'Benchmark Test Budget',
            description: 'Created for performance testing',
            user_id: user.id,
          })
          .select('id')
          .single();

        if (!newBudget) {
          throw new Error('Failed to create test budget');
        }

        testBudgetId = newBudget.id;
        console.log(`📁 Created test budget: ${testBudgetId}`);
      }

      // Benchmark 1: Simple SELECT
      await this.benchmarkOperation(
        'Simple SELECT (budgets)',
        async () => {
          const { data, error } = await this.postgrestClient.select('budgets', {
            filters: { 'user_id': `eq.${user.id}` },
            limit: 10,
          });
          if (error) throw error;
          return data;
        },
        async () => {
          const { data, error } = await this.supabaseClient
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .limit(10);
          if (error) throw error;
          return data;
        }
      );

      // Benchmark 2: Complex SELECT with JOIN
      await this.benchmarkOperation(
        'Complex SELECT with JOIN',
        async () => {
          const { data, error } = await this.postgrestClient.select('envelopes', {
            columns: '*,category:categories(name,is_income),transactions(*)',
            filters: { 'budget_id': `eq.${testBudgetId}` },
            limit: 20,
          });
          if (error) throw error;
          return data;
        },
        async () => {
          const { data, error } = await this.supabaseClient
            .from('envelopes')
            .select('*,category:categories(name,is_income),transactions(*)')
            .eq('budget_id', testBudgetId)
            .limit(20);
          if (error) throw error;
          return data;
        }
      );

      // Benchmark 3: COUNT query
      await this.benchmarkOperation(
        'COUNT query',
        async () => {
          const { data, error, count } = await this.postgrestClient.select('transactions', {
            filters: { 'budget_id': `eq.${testBudgetId}` },
            limit: 1,
            count: 'exact',
          });
          if (error) throw error;
          return { data, count };
        },
        async () => {
          const { data, error, count } = await this.supabaseClient
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('budget_id', testBudgetId)
            .limit(1);
          if (error) throw error;
          return { data, count };
        }
      );

      // Benchmark 4: INSERT operation
      await this.benchmarkOperation(
        'INSERT operation',
        async () => {
          const { data, error } = await this.postgrestClient.insert('categories', {
            budget_id: testBudgetId,
            name: `Benchmark Category ${Date.now()}-${Math.random()}`,
            is_income: false,
            display_order: 1,
          });
          if (error) throw error;
          return data;
        },
        async () => {
          const { data, error } = await this.supabaseClient
            .from('categories')
            .insert({
              budget_id: testBudgetId,
              name: `Benchmark Category ${Date.now()}-${Math.random()}`,
              is_income: false,
              display_order: 1,
            })
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      );

      // Benchmark 5: Direct fetch vs Supabase client
      await this.benchmarkOperation(
        'Direct fetch vs Supabase',
        async () => {
          const session = (await this.supabaseClient.auth.getSession()).data.session;
          const headers = createPostgRESTHeaders(SUPABASE_ANON_KEY, session);
          
          const response = await fetch(`${SUPABASE_URL}/rest/v1/budgets?user_id=eq.${user.id}&limit=5`, {
            headers: headers as Record<string, string>,
          });
          
          if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
          }
          
          return response.json();
        },
        async () => {
          const { data, error } = await this.supabaseClient
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .limit(5);
          if (error) throw error;
          return data;
        }
      );

      // Benchmark 6: Bulk operations
      const bulkData = Array.from({ length: 5 }, (_, i) => ({
        budget_id: testBudgetId,
        name: `Bulk Test ${Date.now()}-${i}`,
        is_income: false,
        display_order: i,
      }));

      await this.benchmarkOperation(
        'Bulk INSERT (5 records)',
        async () => {
          const { data, error } = await this.postgrestClient.insert('categories', bulkData);
          if (error) throw error;
          return data;
        },
        async () => {
          const { data, error } = await this.supabaseClient
            .from('categories')
            .insert(bulkData)
            .select();
          if (error) throw error;
          return data;
        }
      );

      // Print summary
      this.printSummary();

      // Cleanup
      await this.cleanup(testBudgetId);

    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  }

  private printSummary(): void {
    console.log('\n📊 BENCHMARK SUMMARY');
    console.log('='.repeat(80));
    
    let postgrestWins = 0;
    let supabaseWins = 0;
    
    this.results.forEach(result => {
      const winner = result.improvement > 0 ? 'PostgREST' : 'Supabase';
      const winnerSymbol = result.improvement > 0 ? '🟢' : '🔴';
      const improvement = Math.abs(result.improvement).toFixed(1);
      
      console.log(`${winnerSymbol} ${result.operation.padEnd(25)} | PostgREST: ${result.postgrestMs.toFixed(2)}ms | Supabase: ${result.supabaseMs.toFixed(2)}ms | ${winner} wins by ${improvement}%`);
      
      if (result.improvement > 0) {
        postgrestWins++;
      } else {
        supabaseWins++;
      }
    });
    
    console.log('='.repeat(80));
    console.log(`🏆 Overall Results: PostgREST wins ${postgrestWins}, Supabase wins ${supabaseWins}`);
    
    const avgPostgrestTime = this.results.reduce((sum, r) => sum + r.postgrestMs, 0) / this.results.length;
    const avgSupabaseTime = this.results.reduce((sum, r) => sum + r.supabaseMs, 0) / this.results.length;
    const overallImprovement = ((avgSupabaseTime - avgPostgrestTime) / avgSupabaseTime) * 100;
    
    console.log(`📈 Average Performance: PostgREST ${avgPostgrestTime.toFixed(2)}ms, Supabase ${avgSupabaseTime.toFixed(2)}ms`);
    console.log(`🎯 Overall: ${overallImprovement > 0 ? 'PostgREST' : 'Supabase'} is ${Math.abs(overallImprovement).toFixed(1)}% faster on average`);
    
    console.log('\n💡 Key Insights:');
    console.log('- PostgREST typically performs better for simple operations due to less overhead');
    console.log('- Supabase client may perform better for complex operations due to optimizations');
    console.log('- Network latency and server load can significantly impact results');
    console.log('- Use PostgREST for bulk operations and simple queries');
    console.log('- Use Supabase client for complex business logic and real-time features');
  }

  private async cleanup(testBudgetId: string): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test categories
      const { error } = await this.supabaseClient
        .from('categories')
        .delete()
        .eq('budget_id', testBudgetId)
        .or('name.like.*Benchmark*,name.like.*Bulk Test*');
      
      if (error) {
        console.warn('Cleanup warning:', error);
      } else {
        console.log('✅ Test data cleaned up successfully');
      }
    } catch (error) {
      console.warn('⚠️ Cleanup error:', error);
    }
  }
}

// Run benchmark if this file is executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.run().catch(console.error);
}