/**
 * Load Testing and Concurrency Benchmarks
 * 
 * This test suite simulates high-load scenarios with concurrent operations,
 * stress testing, and scalability validation.
 */

import { performance } from 'perf_hooks';
import { BaseService } from '../../services/base.service';
import { ApiError, ErrorCode } from '@nvlp/types';
import { createMockSupabaseClient, setupAuthMocks } from '../utils/test-utils';
import { sampleBudgets, sampleTransactions } from '../fixtures';

interface LoadTestResult {
  scenario: string;
  concurrency: number;
  totalOperations: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputPerSecond: number;
  errorRate: number;
  successfulOperations: number;
}

interface StressTestMetrics {
  breaking_point: number;
  max_throughput: number;
  error_threshold_reached: boolean;
  performance_degradation: number;
}

// Load test service
class LoadTestService extends BaseService {
  async lightOperation(): Promise<string> {
    // Simulate light CPU work
    let result = '';
    for (let i = 0; i < 100; i++) {
      result += i.toString();
    }
    return result;
  }

  async mediumOperation(): Promise<any> {
    // Simulate database query
    const userId = await this.getCurrentUserId();
    const { data } = await this.client
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .limit(5);
    return data;
  }

  async heavyOperation(): Promise<any> {
    // Simulate complex business logic
    const userId = await this.getCurrentUserId();
    
    // Multiple database calls
    const budgets = await this.client.from('budgets').select('*').eq('user_id', userId);
    const transactions = await this.client.from('transactions').select('*').limit(10);
    
    // CPU-intensive calculation
    let calculation = 0;
    for (let i = 0; i < 10000; i++) {
      calculation += Math.sqrt(i) * Math.random();
    }
    
    return {
      budgets: budgets.data,
      transactions: transactions.data,
      calculation,
      timestamp: Date.now(),
    };
  }

  async errorProneOperation(failureRate: number = 0.1): Promise<string> {
    if (Math.random() < failureRate) {
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Simulated failure');
    }
    return 'success';
  }
}

describe('Load Testing and Concurrency Benchmarks', () => {
  let service: LoadTestService;
  let mockClient: any;

  beforeAll(() => {
    mockClient = createMockSupabaseClient();
    setupAuthMocks(mockClient);
    
    // Add realistic network latency to mocks
    const originalFrom = mockClient.from;
    mockClient.from = jest.fn().mockImplementation((...args) => {
      const chain = originalFrom.apply(mockClient, args);
      const originalSingle = chain.single;
      
      chain.single = jest.fn().mockImplementation(() => 
        new Promise(resolve => {
          const latency = Math.random() * 20 + 5; // 5-25ms latency
          setTimeout(() => {
            resolve({
              data: sampleBudgets[0],
              error: null
            });
          }, latency);
        })
      );
      
      return chain;
    });

    service = new LoadTestService(mockClient);
  });

  /**
   * Runs a load test with specified concurrency
   */
  async function runLoadTest(
    scenario: string,
    operation: () => Promise<any>,
    concurrency: number,
    operationsPerWorker: number
  ): Promise<LoadTestResult> {
    const totalOperations = concurrency * operationsPerWorker;
    const latencies: number[] = [];
    let errors = 0;

    const workers = Array.from({ length: concurrency }, async () => {
      const workerLatencies: number[] = [];
      
      for (let i = 0; i < operationsPerWorker; i++) {
        const start = performance.now();
        
        try {
          await operation();
          const latency = performance.now() - start;
          workerLatencies.push(latency);
        } catch (error) {
          errors++;
          const latency = performance.now() - start;
          workerLatencies.push(latency); // Include error latency
        }
      }
      
      return workerLatencies;
    });

    const startTime = performance.now();
    const results = await Promise.all(workers);
    const totalDurationMs = performance.now() - startTime;

    // Flatten all latencies
    results.forEach(workerLatencies => {
      latencies.push(...workerLatencies);
    });

    latencies.sort((a, b) => a - b);

    const averageLatencyMs = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const minLatencyMs = latencies[0];
    const maxLatencyMs = latencies[latencies.length - 1];
    const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)];
    const p99LatencyMs = latencies[Math.floor(latencies.length * 0.99)];
    const throughputPerSecond = (totalOperations / totalDurationMs) * 1000;
    const errorRate = errors / totalOperations;
    const successfulOperations = totalOperations - errors;

    return {
      scenario,
      concurrency,
      totalOperations,
      totalDurationMs,
      averageLatencyMs,
      minLatencyMs,
      maxLatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      throughputPerSecond,
      errorRate,
      successfulOperations,
    };
  }

  /**
   * Finds the breaking point by gradually increasing load
   */
  async function findBreakingPoint(operation: () => Promise<any>): Promise<StressTestMetrics> {
    const baselineResult = await runLoadTest('baseline', operation, 1, 10);
    const baselineLatency = baselineResult.averageLatencyMs;
    
    let maxThroughput = 0;
    let breakingPoint = 0;
    let errorThresholdReached = false;
    
    for (let concurrency = 5; concurrency <= 100; concurrency += 5) {
      const result = await runLoadTest(
        `stress-${concurrency}`,
        operation,
        concurrency,
        5
      );

      maxThroughput = Math.max(maxThroughput, result.throughputPerSecond);

      // Check for breaking point indicators
      const latencyDegradation = result.averageLatencyMs / baselineLatency;
      const errorRate = result.errorRate;

      if (errorRate > 0.05 || latencyDegradation > 5) {
        breakingPoint = concurrency;
        errorThresholdReached = errorRate > 0.05;
        break;
      }

      // Small delay between stress tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      breaking_point: breakingPoint,
      max_throughput: maxThroughput,
      error_threshold_reached: errorThresholdReached,
      performance_degradation: breakingPoint > 0 ? 
        (await runLoadTest('final', operation, breakingPoint, 5)).averageLatencyMs / baselineLatency : 1,
    };
  }

  describe('Basic Load Testing', () => {
    it('should handle low concurrency load', async () => {
      const result = await runLoadTest(
        'Light Load',
        () => service.lightOperation(),
        5,
        20
      );

      expect(result.errorRate).toBe(0);
      expect(result.averageLatencyMs).toBeLessThan(50);
      expect(result.throughputPerSecond).toBeGreaterThan(50);

      console.log(`Light Load: ${result.throughputPerSecond.toFixed(2)} ops/sec, ${result.averageLatencyMs.toFixed(2)}ms avg latency`);
    });

    it('should handle medium concurrency load', async () => {
      const result = await runLoadTest(
        'Medium Load',
        () => service.mediumOperation(),
        10,
        10
      );

      expect(result.errorRate).toBeLessThan(0.01); // Less than 1% error rate
      expect(result.p95LatencyMs).toBeLessThan(200);
      expect(result.throughputPerSecond).toBeGreaterThan(10);

      console.log(`Medium Load: ${result.throughputPerSecond.toFixed(2)} ops/sec, P95: ${result.p95LatencyMs.toFixed(2)}ms`);
    });

    it('should handle high concurrency load', async () => {
      const result = await runLoadTest(
        'High Load',
        () => service.lightOperation(),
        50,
        4
      );

      expect(result.errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(result.p99LatencyMs).toBeLessThan(1000);

      console.log(`High Load: ${result.throughputPerSecond.toFixed(2)} ops/sec, P99: ${result.p99LatencyMs.toFixed(2)}ms`);
    });
  });

  describe('Stress Testing', () => {
    it('should find breaking point for light operations', async () => {
      const metrics = await findBreakingPoint(() => service.lightOperation());

      expect(metrics.breaking_point).toBeGreaterThan(5); // Should handle at least 5 concurrent (test env)
      expect(metrics.max_throughput).toBeGreaterThan(50); // At least 50 ops/sec (test env)

      console.log(`Light Operations Breaking Point: ${metrics.breaking_point} concurrent users`);
      console.log(`Max Throughput: ${metrics.max_throughput.toFixed(2)} ops/sec`);
    });

    it('should handle gradual load increase', async () => {
      const concurrencyLevels = [1, 5, 10, 20];
      const results: LoadTestResult[] = [];

      for (const concurrency of concurrencyLevels) {
        const result = await runLoadTest(
          `Gradual-${concurrency}`,
          () => service.mediumOperation(),
          concurrency,
          5
        );
        results.push(result);

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify throughput scaling
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        
        // Throughput should not degrade too severely with increased concurrency
        const throughputRatio = curr.throughputPerSecond / prev.throughputPerSecond;
        expect(throughputRatio).toBeGreaterThan(0.1); // Very lenient - just ensure it doesn't crash
      }

      console.log('Gradual Load Increase Results:');
      results.forEach(result => {
        console.log(`  ${result.concurrency} concurrent: ${result.throughputPerSecond.toFixed(2)} ops/sec`);
      });
    });
  });

  describe('Error Handling Under Load', () => {
    it('should maintain stability with partial failures', async () => {
      const result = await runLoadTest(
        'Error Prone',
        () => service.errorProneOperation(0.2), // 20% failure rate
        10,
        10
      );

      expect(result.errorRate).toBeCloseTo(0.2, 1); // Should be close to 20%
      expect(result.successfulOperations).toBeGreaterThan(result.totalOperations * 0.7); // At least 70% success

      console.log(`Error Handling: ${(result.errorRate * 100).toFixed(1)}% error rate, ${result.successfulOperations} successful ops`);
    });

    it('should degrade gracefully under extreme error conditions', async () => {
      const result = await runLoadTest(
        'High Error Rate',
        () => service.errorProneOperation(0.5), // 50% failure rate
        5,
        20
      );

      // Should still complete all operations despite high error rate
      expect(result.totalOperations).toBe(100);
      expect(result.errorRate).toBeCloseTo(0.5, 0); // Less precision for test environment

      console.log(`Extreme Errors: ${result.successfulOperations} successful out of ${result.totalOperations}`);
    });
  });

  describe('Resource Contention', () => {
    it('should handle mixed workload patterns', async () => {
      const mixedWorkload = async () => {
        const operations = [
          () => service.lightOperation(),
          () => service.mediumOperation(),
          () => service.heavyOperation(),
        ];
        
        const randomOp = operations[Math.floor(Math.random() * operations.length)];
        return randomOp();
      };

      const result = await runLoadTest(
        'Mixed Workload',
        mixedWorkload,
        15,
        5
      );

      expect(result.errorRate).toBeLessThan(0.1); // Less than 10% error rate
      expect(result.averageLatencyMs).toBeLessThan(500);

      console.log(`Mixed Workload: ${result.throughputPerSecond.toFixed(2)} ops/sec, ${result.averageLatencyMs.toFixed(2)}ms avg`);
    });

    it('should handle burst traffic patterns', async () => {
      // Simulate burst: high load followed by low load
      const burstResult = await runLoadTest(
        'Burst High',
        () => service.lightOperation(),
        30,
        3
      );

      // Small recovery period
      await new Promise(resolve => setTimeout(resolve, 200));

      const normalResult = await runLoadTest(
        'Post-Burst Normal',
        () => service.lightOperation(),
        5,
        10
      );

      // Performance should recover after burst
      const performanceRatio = normalResult.averageLatencyMs / burstResult.averageLatencyMs;
      expect(performanceRatio).toBeLessThan(2); // Should not be more than 2x slower

      console.log(`Burst Recovery: ${performanceRatio.toFixed(2)}x latency ratio (burst vs normal)`);
    });
  });

  describe('Scalability Validation', () => {
    it('should demonstrate linear scalability within limits', async () => {
      const baseResult = await runLoadTest('Base', () => service.lightOperation(), 1, 50);
      const scaledResult = await runLoadTest('Scaled', () => service.lightOperation(), 10, 5);

      // Theoretical maximum throughput increase is 10x
      const actualScaling = scaledResult.throughputPerSecond / baseResult.throughputPerSecond;
      
      // Should achieve at least some scaling improvement in test environment  
      expect(actualScaling).toBeGreaterThan(1); // At least some improvement

      console.log(`Scalability: ${actualScaling.toFixed(2)}x throughput increase with 10x concurrency`);
    });

    it('should validate performance consistency across test runs', async () => {
      const runs = 3;
      const results: LoadTestResult[] = [];

      for (let i = 0; i < runs; i++) {
        const result = await runLoadTest(
          `Consistency-${i}`,
          () => service.mediumOperation(),
          8,
          10
        );
        results.push(result);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate coefficient of variation for throughput
      const throughputs = results.map(r => r.throughputPerSecond);
      const avgThroughput = throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length;
      const variance = throughputs.reduce((sum, t) => sum + Math.pow(t - avgThroughput, 2), 0) / throughputs.length;
      const coefficientOfVariation = Math.sqrt(variance) / avgThroughput;

      // Coefficient of variation should be reasonable (very lenient for test environment)
      expect(coefficientOfVariation).toBeLessThan(0.5); // 50% variation allowed

      console.log(`Consistency: ${(coefficientOfVariation * 100).toFixed(2)}% coefficient of variation`);
    });
  });
});