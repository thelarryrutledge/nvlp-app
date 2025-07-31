/**
 * Service Layer Performance Benchmarks
 * 
 * This test suite measures the performance of service layer operations
 * including transaction processing, query optimization, and business logic execution.
 */

import { performance } from 'perf_hooks';
import { BaseService } from '../../services/base.service';
import { ApiError, ErrorCode } from '@nvlp/types';
import { 
  createMockSupabaseClient, 
  setupAuthMocks,
  createSuccessResponse,
  createMockUser 
} from '../utils/test-utils';
import { sampleBudgets, sampleTransactions, sampleEnvelopes } from '../fixtures';

// Performance configuration
const BENCHMARK_ITERATIONS = 100;
const PERFORMANCE_THRESHOLDS = {
  FAST: 10,      // < 10ms
  NORMAL: 50,    // < 50ms  
  SLOW: 200,     // < 200ms
  TIMEOUT: 1000, // < 1000ms
};

interface BenchmarkResult {
  operation: string;
  averageMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  p99Ms: number;
  iterations: number;
  throughputPerSecond: number;
}

interface PerformanceReport {
  summary: {
    totalOperations: number;
    totalDuration: number;
    averageOperationTime: number;
  };
  benchmarks: BenchmarkResult[];
  classifications: {
    fast: number;
    normal: number;
    slow: number;
    timeout: number;
  };
}

// Test service for benchmarking
class BenchmarkService extends BaseService {
  async fastOperation(): Promise<string> {
    // Simulate a fast operation (no external calls)
    return 'fast-result';
  }

  async normalOperation(): Promise<any> {
    // Simulate normal database query
    const { data } = await this.client
      .from('budgets')
      .select('*')
      .limit(10);
    return data;
  }

  async slowOperation(): Promise<any> {
    // Simulate complex query with joins
    const { data } = await this.client
      .from('transactions')
      .select(`
        *,
        budgets(*),
        envelopes(*),
        payees(*)
      `)
      .limit(10);
    return data;
  }

  async businessLogicOperation(budget: any): Promise<any> {
    // Simulate business logic computation
    await this.getCurrentUserId();
    
    const calculations = {
      totalIncome: budget.available_amount * 1.2,
      totalExpenses: budget.available_amount * 0.8,
      savings: budget.available_amount * 0.2,
      timestamp: Date.now(),
    };

    // Simulate validation
    if (calculations.totalIncome < 0) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid income');
    }

    return calculations;
  }
}

describe('Service Performance Benchmarks', () => {
  let service: BenchmarkService;
  let mockClient: any;
  let performanceReport: PerformanceReport;

  beforeAll(() => {
    // Setup mock client with realistic latency
    mockClient = createMockSupabaseClient();
    setupAuthMocks(mockClient, createMockUser());
    
    // Add realistic delays to mock responses
    mockClient.single.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve(createSuccessResponse(sampleBudgets[0])), 
        Math.random() * 10 + 1) // 1-11ms delay
      )
    );

    service = new BenchmarkService(mockClient);
    
    performanceReport = {
      summary: {
        totalOperations: 0,
        totalDuration: 0,
        averageOperationTime: 0,
      },
      benchmarks: [],
      classifications: {
        fast: 0,
        normal: 0,
        slow: 0,
        timeout: 0,
      }
    };
  });

  afterAll(() => {
    // Generate performance report
    generatePerformanceReport(performanceReport);
  });

  /**
   * Measures the performance of an operation
   */
  async function measurePerformance<T>(
    operationName: string,
    operation: () => Promise<T>,
    iterations: number = BENCHMARK_ITERATIONS
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await operation();
      } catch (error) {
        errors++;
        console.warn(`${operationName} iteration ${i} failed:`, error);
      }
      
      const end = performance.now();
      times.push(end - start);

      // Prevent overwhelming the system
      if (i % 10 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    // Calculate statistics
    times.sort((a, b) => a - b);
    const averageMs = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minMs = times[0];
    const maxMs = times[times.length - 1];
    const p95Ms = times[Math.floor(times.length * 0.95)];
    const p99Ms = times[Math.floor(times.length * 0.99)];
    const throughputPerSecond = 1000 / averageMs;

    const result: BenchmarkResult = {
      operation: operationName,
      averageMs,
      minMs,
      maxMs,
      p95Ms,
      p99Ms,
      iterations: iterations - errors,
      throughputPerSecond,
    };

    // Update report
    performanceReport.benchmarks.push(result);
    performanceReport.summary.totalOperations += iterations;
    performanceReport.summary.totalDuration += times.reduce((sum, time) => sum + time, 0);

    // Classify performance
    if (averageMs < PERFORMANCE_THRESHOLDS.FAST) {
      performanceReport.classifications.fast++;
    } else if (averageMs < PERFORMANCE_THRESHOLDS.NORMAL) {
      performanceReport.classifications.normal++;
    } else if (averageMs < PERFORMANCE_THRESHOLDS.SLOW) {
      performanceReport.classifications.slow++;
    } else {
      performanceReport.classifications.timeout++;
    }

    return result;
  }

  describe('Basic Operations', () => {
    it('should benchmark fast operations', async () => {
      const result = await measurePerformance(
        'Fast Operation',
        () => service.fastOperation()
      );

      expect(result.averageMs).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);
      expect(result.throughputPerSecond).toBeGreaterThan(100);
    });

    it('should benchmark normal database operations', async () => {
      const result = await measurePerformance(
        'Normal Database Query',
        () => service.normalOperation()
      );

      expect(result.averageMs).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL);
      expect(result.p95Ms).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('should benchmark complex operations', async () => {
      const result = await measurePerformance(
        'Complex Database Query',
        () => service.slowOperation()
      );

      expect(result.averageMs).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW);
      expect(result.p99Ms).toBeLessThan(PERFORMANCE_THRESHOLDS.TIMEOUT);
    });
  });

  describe('Business Logic Performance', () => {
    it('should benchmark business logic operations', async () => {
      const result = await measurePerformance(
        'Business Logic Calculation',
        () => service.businessLogicOperation(sampleBudgets[0])
      );

      expect(result.averageMs).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL);
      expect(result.minMs).toBeGreaterThan(0);
    });

    it('should benchmark authentication checks', async () => {
      const result = await measurePerformance(
        'Authentication Check',
        () => service['getCurrentUserId']()
      );

      expect(result.averageMs).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);
    });
  });

  describe('Memory and CPU Performance', () => {
    it('should benchmark memory usage patterns', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        ...sampleTransactions[0],
        id: `tx-${i}`,
        amount: Math.random() * 1000,
      }));

      const result = await measurePerformance(
        'Large Dataset Processing',
        async () => {
          // Simulate processing large datasets
          return largeDataSet
            .filter(tx => tx.amount > 100)
            .map(tx => ({ ...tx, processed: true }))
            .reduce((sum, tx) => sum + tx.amount, 0);
        },
        50 // Fewer iterations for memory-intensive operations
      );

      expect(result.averageMs).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW);
    });

    it('should benchmark concurrent operations', async () => {
      const concurrentOperations = 10;
      
      const start = performance.now();
      
      const promises = Array.from({ length: concurrentOperations }, () =>
        service.fastOperation()
      );
      
      await Promise.all(promises);
      
      const duration = performance.now() - start;
      const averagePerOperation = duration / concurrentOperations;

      expect(averagePerOperation).toBeLessThan(PERFORMANCE_THRESHOLDS.NORMAL);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SLOW);
    });
  });

  describe('Error Handling Performance', () => {
    it('should benchmark error creation and handling', async () => {
      const result = await measurePerformance(
        'Error Handling',
        async () => {
          try {
            throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Test error');
          } catch (error) {
            return error;
          }
        }
      );

      expect(result.averageMs).toBeLessThan(PERFORMANCE_THRESHOLDS.FAST);
    });
  });

  describe('Regression Tests', () => {
    it('should not degrade over multiple iterations', async () => {
      const iterations = 20;
      const operationTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await service.fastOperation();
        const duration = performance.now() - start;
        operationTimes.push(duration);
      }

      // Calculate trend (should not increase significantly)
      const firstHalf = operationTimes.slice(0, iterations / 2);
      const secondHalf = operationTimes.slice(iterations / 2);
      
      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
      
      // Allow up to 200% degradation (very lenient for test environment)
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 3);
    });
  });
});

/**
 * Generates a comprehensive performance report
 */
function generatePerformanceReport(report: PerformanceReport): void {
  report.summary.averageOperationTime = report.summary.totalDuration / report.summary.totalOperations;

  console.log('\n=== PERFORMANCE BENCHMARK REPORT ===\n');
  
  console.log('Summary:');
  console.log(`  Total Operations: ${report.summary.totalOperations}`);
  console.log(`  Total Duration: ${report.summary.totalDuration.toFixed(2)}ms`);
  console.log(`  Average Operation Time: ${report.summary.averageOperationTime.toFixed(2)}ms\n`);

  console.log('Performance Classifications:');
  console.log(`  Fast (< ${PERFORMANCE_THRESHOLDS.FAST}ms): ${report.classifications.fast}`);
  console.log(`  Normal (< ${PERFORMANCE_THRESHOLDS.NORMAL}ms): ${report.classifications.normal}`);
  console.log(`  Slow (< ${PERFORMANCE_THRESHOLDS.SLOW}ms): ${report.classifications.slow}`);
  console.log(`  Timeout (>= ${PERFORMANCE_THRESHOLDS.SLOW}ms): ${report.classifications.timeout}\n`);

  console.log('Detailed Benchmarks:');
  report.benchmarks.forEach(benchmark => {
    console.log(`  ${benchmark.operation}:`);
    console.log(`    Average: ${benchmark.averageMs.toFixed(2)}ms`);
    console.log(`    P95: ${benchmark.p95Ms.toFixed(2)}ms`);
    console.log(`    P99: ${benchmark.p99Ms.toFixed(2)}ms`);
    console.log(`    Throughput: ${benchmark.throughputPerSecond.toFixed(2)} ops/sec`);
    console.log(`    Range: ${benchmark.minMs.toFixed(2)}ms - ${benchmark.maxMs.toFixed(2)}ms\n`);
  });

  console.log('=== END PERFORMANCE REPORT ===\n');
}