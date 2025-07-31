# Performance Testing Guide

This guide explains how to run and interpret PostgREST performance tests for the NVLP API.

## Quick Start

### Prerequisites

1. **Environment Setup**
   ```bash
   # Set up environment variables in .env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Authentication**
   - Ensure you have a test user account set up in Supabase
   - The tests require authentication to access budgets and create test data

### Running Performance Tests

#### Option 1: Standalone Benchmark Script
```bash
# Install dependencies
pnpm install

# Run the comprehensive benchmark
pnpm --filter @nvlp/api benchmark
```

#### Option 2: Jest Performance Tests
```bash
# Run performance tests via Jest
pnpm --filter @nvlp/api test:performance
```

#### Option 3: Manual Jest Execution
```bash
# Run specific performance test file
pnpm --filter @nvlp/api test src/__tests__/performance/postgrest-performance.test.ts
```

## Understanding Results

### Benchmark Output

The benchmark script provides detailed output:

```
🚀 Starting PostgREST Performance Benchmark
📊 Configuration: 20 iterations, 5 warmup
👤 Authenticated as: test@example.com

🔄 Benchmarking Simple SELECT (budgets)...
   PostgREST: 45.23ms (38.45-52.67ms)
   Supabase:  52.18ms (47.33-58.91ms)
   Winner: PostgREST (13.3% faster)

📊 BENCHMARK SUMMARY
================================================================================
🟢 Simple SELECT (budgets)    | PostgREST: 45.23ms | Supabase: 52.18ms | PostgREST wins by 13.3%
🔴 Complex SELECT with JOIN   | PostgREST: 78.45ms | Supabase: 72.31ms | Supabase wins by 8.5%
🟢 INSERT operation          | PostgREST: 67.12ms | Supabase: 73.45ms | PostgREST wins by 8.6%
================================================================================
🏆 Overall Results: PostgREST wins 2, Supabase wins 1
```

### Key Metrics

1. **Average Response Time**: Mean execution time across all iterations
2. **Min/Max Range**: Performance consistency indicator
3. **Percentage Improvement**: Relative performance difference
4. **Win Rate**: Number of operations where each method performs better

### Performance Thresholds

Consider these as guidelines for acceptable performance:

- **Simple SELECT**: < 100ms
- **Complex JOIN**: < 200ms
- **INSERT**: < 150ms
- **COUNT**: < 300ms
- **Bulk Operations**: < 500ms

## Test Categories

### 1. Basic CRUD Operations
Tests fundamental database operations:
- SELECT queries with filtering
- INSERT operations with single/multiple records
- UPDATE operations with conditions
- DELETE operations (soft delete)

### 2. Complex Query Operations
Tests advanced database features:
- JOIN queries with embedded resources
- COUNT queries with exact/estimated counts
- Pagination with range headers
- Full-text search operations

### 3. Bulk Operations
Tests batch processing capabilities:
- Bulk INSERT (5-100 records)
- Bulk UPDATE with conditions
- Batch DELETE operations
- Transaction handling

### 4. Auth Header Overhead
Tests authentication-related performance:
- Header creation time
- Token validation overhead
- Session refresh impact

## Interpreting Results

### When PostgREST Wins

PostgREST typically performs better for:
- Simple CRUD operations (10-20% faster)
- Bulk operations (5-15% faster)
- Operations with minimal business logic
- Serverless environments

**Why**: Lower overhead, direct HTTP requests, minimal processing

### When Supabase Client Wins

Supabase client typically performs better for:
- Complex JOIN queries (5-10% faster)
- Operations requiring connection pooling
- Real-time subscriptions
- Complex error handling scenarios

**Why**: Connection pooling, query optimization, built-in retry logic

### Performance Factors

1. **Network Latency**
   - Local development: 10-50ms
   - Same region: 50-100ms
   - Cross-region: 100-500ms

2. **Database Load**
   - Low load: Baseline performance
   - High load: Connection pooling benefits Supabase
   - Very high load: PostgREST may perform better

3. **Query Complexity**
   - Simple queries: PostgREST advantage
   - Complex queries: Supabase advantage
   - Bulk operations: PostgREST advantage

## Optimization Recommendations

### Based on Test Results

1. **If PostgREST is consistently faster**:
   ```typescript
   // Use PostgREST for bulk operations
   async bulkCreateEnvelopes(envelopes: Envelope[]) {
     return this.postgrestClient.insert('envelopes', envelopes);
   }
   ```

2. **If Supabase is consistently faster**:
   ```typescript
   // Use Supabase for complex queries
   async getTransactionSummary(budgetId: string) {
     return this.supabaseClient
       .from('transactions')
       .select('*, envelope:envelopes(*), payee:payees(*)')
       .eq('budget_id', budgetId);
   }
   ```

3. **Hybrid approach** (recommended):
   ```typescript
   class OptimizedDataService {
     // Use PostgREST for simple operations
     async getActiveEnvelopes(budgetId: string) {
       return this.postgrestClient.envelopes
         .eq('budget_id', budgetId)
         .eq('is_active', true)
         .get();
     }

     // Use Supabase for complex operations
     async getBudgetSummary(budgetId: string) {
       return this.supabaseClient.rpc('get_budget_summary', { budget_id: budgetId });
     }
   }
   ```

## Continuous Performance Monitoring

### Setting Up Monitoring

1. **Production Metrics**
   ```typescript
   import { performance } from 'perf_hooks';

   class PerformanceMonitor {
     private metrics: Map<string, number[]> = new Map();

     async trackOperation<T>(
       operation: string,
       fn: () => Promise<T>
     ): Promise<T> {
       const start = performance.now();
       try {
         const result = await fn();
         this.recordMetric(operation, performance.now() - start);
         return result;
       } catch (error) {
         this.recordMetric(operation, performance.now() - start, true);
         throw error;
       }
     }
   }
   ```

2. **Performance Alerts**
   ```typescript
   // Alert when operations exceed thresholds
   const thresholds = {
     'select-simple': 100,
     'select-complex': 200,
     'insert': 150,
     'update': 150,
     'delete': 100,
   };

   if (duration > thresholds[operation]) {
     logger.warn(`Slow operation detected: ${operation} took ${duration}ms`);
   }
   ```

### Regular Testing

1. **Automated Performance Tests**
   ```bash
   # Add to CI/CD pipeline
   - name: Run Performance Tests
     run: pnpm --filter @nvlp/api test:performance
   ```

2. **Weekly Benchmarks**
   ```bash
   # Schedule weekly benchmark runs
   - name: Weekly Performance Benchmark
     run: pnpm --filter @nvlp/api benchmark
   ```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```
   Error: No active session
   ```
   **Solution**: Ensure you're logged in before running tests

2. **Permission Errors**
   ```
   Error: new row violates row-level security policy
   ```
   **Solution**: Check RLS policies and user permissions

3. **Network Timeouts**
   ```
   Error: Request timeout
   ```
   **Solution**: Increase timeout values or check network connectivity

4. **Database Connection Issues**
   ```
   Error: Connection refused
   ```
   **Solution**: Verify Supabase URL and ensure database is accessible

### Performance Debugging

1. **Enable Detailed Logging**
   ```typescript
   // Add debug logging to operations
   console.time('postgrest-select');
   const result = await postgrestClient.select('budgets');
   console.timeEnd('postgrest-select');
   ```

2. **Check Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   WHERE mean_exec_time > 100 
   ORDER BY mean_exec_time DESC;
   ```

3. **Monitor Resource Usage**
   ```bash
   # Check CPU and memory usage during tests
   top -p $(pgrep node)
   ```

## Customizing Tests

### Adding New Benchmarks

1. **Add to benchmark script**:
   ```typescript
   await this.benchmarkOperation(
     'Custom Operation',
     async () => {
       // PostgREST implementation
       return this.postgrestClient.customOperation();
     },
     async () => {
       // Supabase implementation
       return this.supabaseClient.customOperation();
     }
   );
   ```

2. **Add to Jest tests**:
   ```typescript
   it('should measure custom operation performance', async () => {
     const postgrestPerf = await measureTime(async () => {
       // PostgREST operation
     });

     const supabasePerf = await measureTime(async () => {
       // Supabase operation
     });

     expect(postgrestPerf.averageMs).toBeGreaterThan(0);
   });
   ```

### Adjusting Test Parameters

```typescript
// Modify these constants in the test files
const PERFORMANCE_ITERATIONS = 20;  // Number of test iterations
const WARMUP_ITERATIONS = 5;        // Warmup iterations
const TIMEOUT_MS = 30000;           // Test timeout
```

## Best Practices

1. **Run tests in consistent environments**
2. **Use dedicated test databases when possible**
3. **Clear test data between runs**
4. **Monitor database performance during tests**
5. **Compare results across different time periods**
6. **Document performance regressions**
7. **Set up automated performance alerts**

For more detailed analysis, see the [PostgREST Performance Analysis](./postgrest-performance-analysis.md) document.