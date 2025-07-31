/**
 * Memory and Resource Usage Benchmarks
 * 
 * This test suite measures memory consumption, garbage collection impact,
 * and resource utilization patterns in the API services.
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { createMockSupabaseClient, setupAuthMocks } from '../utils/test-utils';
import { sampleBudgets, sampleTransactions, sampleEnvelopes } from '../fixtures';
import { BaseService } from '../../services/base.service';

interface MemorySnapshot {
  used: number;
  total: number; 
  external: number;
  timestamp: number;
}

interface ResourceMetrics {
  memoryUsage: {
    initial: MemorySnapshot;
    peak: MemorySnapshot;
    final: MemorySnapshot;
    leaked: number;
  };
  gcInfo: {
    collections: number;
    duration: number;
  };
  cpuTime: number;
}

// Memory test service
class MemoryTestService extends BaseService {
  async processLargeDataset(size: number): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < size; i++) {
      const transaction = {
        ...sampleTransactions[0],
        id: `tx-${i}`,
        amount: Math.random() * 1000,
        description: `Generated transaction ${i}`,
      };
      
      // Simulate processing
      const processed = {
        ...transaction,
        processed: true,
        calculatedField: transaction.amount * 1.1,
        timestamp: Date.now(),
      };
      
      results.push(processed);
    }
    
    return results;
  }

  async recursiveOperation(depth: number): Promise<number> {
    if (depth <= 0) return 0;
    
    const result = await this.recursiveOperation(depth - 1);
    return result + depth;
  }

  async memoryIntensiveOperation(): Promise<any> {
    // Create large objects to test memory pressure
    const largeArrays = [];
    
    for (let i = 0; i < 100; i++) {
      largeArrays.push(new Array(1000).fill(i));
    }
    
    // Process the data
    const processed = largeArrays.map(arr => 
      arr.reduce((sum, val) => sum + val, 0)
    );
    
    // Clean up references
    largeArrays.length = 0;
    
    return processed;
  }
}

describe('Memory and Resource Benchmarks', () => {
  let service: MemoryTestService;
  let mockClient: any;
  let gcObserver: PerformanceObserver;
  let gcCollections: number;
  let gcDuration: number;

  beforeAll(() => {
    mockClient = createMockSupabaseClient();
    setupAuthMocks(mockClient);
    service = new MemoryTestService(mockClient);
    
    // Setup GC monitoring
    gcCollections = 0;
    gcDuration = 0;
    
    if (global.gc) {
      gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'gc') {
            gcCollections++;
            gcDuration += entry.duration;
          }
        });
      });
      gcObserver.observe({ entryTypes: ['gc'] });
    }
  });

  afterAll(() => {
    if (gcObserver) {
      gcObserver.disconnect();
    }
  });

  /**
   * Takes a memory snapshot
   */
  function takeMemorySnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      external: memUsage.external,
      timestamp: Date.now(),
    };
  }

  /**
   * Measures resource usage for an operation
   */
  async function measureResourceUsage<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; metrics: ResourceMetrics }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = takeMemorySnapshot();
    const initialGcCollections = gcCollections;
    const initialGcDuration = gcDuration;
    const startCpuTime = process.cpuUsage();

    let peakMemory = initialMemory;
    
    // Monitor memory during operation
    const memoryMonitor = setInterval(() => {
      const current = takeMemorySnapshot();
      if (current.used > peakMemory.used) {
        peakMemory = current;
      }
    }, 10);

    try {
      const result = await operation();
      
      clearInterval(memoryMonitor);
      
      const finalMemory = takeMemorySnapshot();
      const endCpuTime = process.cpuUsage(startCpuTime);
      const finalGcCollections = gcCollections;
      const finalGcDuration = gcDuration;

      const metrics: ResourceMetrics = {
        memoryUsage: {
          initial: initialMemory,
          peak: peakMemory,
          final: finalMemory,
          leaked: finalMemory.used - initialMemory.used,
        },
        gcInfo: {
          collections: finalGcCollections - initialGcCollections,
          duration: finalGcDuration - initialGcDuration,
        },
        cpuTime: (endCpuTime.user + endCpuTime.system) / 1000, // Convert to ms
      };

      return { result, metrics };
    } finally {
      clearInterval(memoryMonitor);
    }
  }

  describe('Memory Usage Patterns', () => {
    it('should not leak memory during normal operations', async () => {
      const { metrics } = await measureResourceUsage(async () => {
        // Perform multiple operations
        for (let i = 0; i < 10; i++) {
          await service.processLargeDataset(100);
        }
      });

      // Allow for some memory increase but not excessive
      const memoryIncreaseMB = metrics.memoryUsage.leaked / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(50); // Less than 50MB increase

      console.log(`Memory usage: ${memoryIncreaseMB.toFixed(2)}MB increase`);
    });

    it('should handle large datasets efficiently', async () => {
      const datasetSize = 10000;
      
      const { result, metrics } = await measureResourceUsage(async () => {
        return service.processLargeDataset(datasetSize);
      });

      expect(result).toHaveLength(datasetSize);
      
      // Memory should be reasonable for dataset size
      const memoryPerItemBytes = metrics.memoryUsage.peak.used / datasetSize;
      expect(memoryPerItemBytes).toBeLessThan(10000); // Less than 10KB per item (generous for test env)

      console.log(`Large dataset processing: ${memoryPerItemBytes.toFixed(2)} bytes per item`);
    });

    it('should manage memory during recursive operations', async () => {
      const { result, metrics } = await measureResourceUsage(async () => {
        return service.recursiveOperation(1000);
      });

      expect(result).toBe(500500); // Sum of 1 to 1000
      
      // Should not cause stack overflow or excessive memory usage
      const memoryIncreaseMB = metrics.memoryUsage.leaked / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(10);

      console.log(`Recursive operation memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    });
  });

  describe('Garbage Collection Impact', () => {
    it('should not trigger excessive garbage collection', async () => {
      const { metrics } = await measureResourceUsage(async () => {
        // Perform memory-intensive operations
        for (let i = 0; i < 5; i++) {
          await service.memoryIntensiveOperation();
        }
      });

      // GC collections should be reasonable
      if (global.gc) {
        expect(metrics.gcInfo.collections).toBeLessThan(10);
        expect(metrics.gcInfo.duration).toBeLessThan(100); // Less than 100ms total GC time
        
        console.log(`GC Impact: ${metrics.gcInfo.collections} collections, ${metrics.gcInfo.duration.toFixed(2)}ms total`);
      }
    });

    it('should recover memory after intensive operations', async () => {
      // Run memory-intensive operation
      const { metrics: intensiveMetrics } = await measureResourceUsage(async () => {
        return service.memoryIntensiveOperation();
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Run simple operation to check memory recovery
      const { metrics: simpleMetrics } = await measureResourceUsage(async () => {
        return service.processLargeDataset(10);
      });

      // Memory should have been mostly recovered
      const memoryRecovered = intensiveMetrics.memoryUsage.peak.used - simpleMetrics.memoryUsage.initial.used;
      const recoveryPercentage = (memoryRecovered / intensiveMetrics.memoryUsage.peak.used) * 100;
      
      expect(recoveryPercentage).toBeGreaterThan(10); // At least 10% recovery (very lenient for test env)

      console.log(`Memory recovery: ${recoveryPercentage.toFixed(2)}% recovered`);
    });
  });

  describe('CPU Usage Patterns', () => {
    it('should use CPU efficiently for data processing', async () => {
      const { metrics } = await measureResourceUsage(async () => {
        return service.processLargeDataset(5000);
      });

      // CPU time should be reasonable (less than 1 second for 5000 items)
      expect(metrics.cpuTime).toBeLessThan(1000);
      
      console.log(`CPU usage: ${metrics.cpuTime.toFixed(2)}ms for 5000 items`);
    });

    it('should not block event loop excessively', async () => {
      const startTime = Date.now();
      let eventLoopBlocked = false;

      // Set up event loop monitoring
      const timer = setInterval(() => {
        const delay = Date.now() - startTime - 50; // Expected 50ms intervals
        if (delay > 100) { // More than 100ms delay indicates blocking
          eventLoopBlocked = true;
        }
      }, 50);

      try {
        await service.processLargeDataset(10000);
        
        // Wait a bit more to catch any delayed blocking
        await new Promise(resolve => setTimeout(resolve, 200));
        
        expect(eventLoopBlocked).toBe(false);
      } finally {
        clearInterval(timer);
      }
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources properly', async () => {
      const iterations = 100;
      const initialMemory = takeMemorySnapshot();

      for (let i = 0; i < iterations; i++) {
        await service.processLargeDataset(100);
        
        // Periodic cleanup check
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      // Force final cleanup
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = takeMemorySnapshot();
      const memoryIncrease = (finalMemory.used - initialMemory.used) / (1024 * 1024);

      // Should not accumulate significant memory over many iterations
      expect(memoryIncrease).toBeLessThan(100); // Less than 100MB total increase

      console.log(`Memory accumulation over ${iterations} iterations: ${memoryIncrease.toFixed(2)}MB`);
    });
  });

  describe('Performance Under Memory Pressure', () => {
    it('should maintain performance under memory constraints', async () => {
      // Create memory pressure
      const memoryBallast: any[] = [];
      
      try {
        // Allocate significant memory
        for (let i = 0; i < 100; i++) {
          memoryBallast.push(new Array(10000).fill(i));
        }

        const start = performance.now();
        await service.processLargeDataset(1000);
        const duration = performance.now() - start;

        // Should still complete in reasonable time despite memory pressure
        expect(duration).toBeLessThan(1000); // Less than 1 second
        
        console.log(`Performance under memory pressure: ${duration.toFixed(2)}ms`);
      } finally {
        // Clean up memory ballast
        memoryBallast.length = 0;
      }
    });
  });
});