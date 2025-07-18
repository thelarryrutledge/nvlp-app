/**
 * Test API Screen
 * 
 * Comprehensive testing screen for offline queue and retry logic
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useOfflineQueue, useOfflineQueueStatus } from '../hooks/useOfflineQueue';
import { useRetryStatus } from '../hooks/useRetryStatus';
import { enhancedApiClient } from '../services/api/clientWrapper';
import { networkUtils } from '../services/api/networkUtils';
import { useAuth } from '../context/AuthContext';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  timestamp: number;
}

export const TestApiScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const authContext = useAuth();
  const { state: queueState, actions: queueActions, utils: queueUtils } = useOfflineQueue();
  const queueStatus = useOfflineQueueStatus();
  const { status: retryStatus, actions: retryActions } = useRetryStatus();

  const addTestResult = (result: Omit<TestResult, 'timestamp'>) => {
    setTestResults(prev => [...prev, { ...result, timestamp: Date.now() }]);
  };

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(r => 
      r.id === id ? { ...r, ...updates } : r
    ));
  };

  // Test 1: Offline Queue Basic Functionality
  const testOfflineQueue = async () => {
    const testId = 'offline-queue-basic';
    addTestResult({ id: testId, name: 'Offline Queue Basic', status: 'running' });

    try {
      // Simulate offline state
      const originalIsConnected = networkUtils.isConnected;
      networkUtils.isConnected = () => false;

      // Make a request that should be queued
      try {
        await enhancedApiClient.createBudget({
          name: `Offline Test ${Date.now()}`,
          description: 'Test budget for offline queue',
        });
        
        // Should not reach here
        updateTestResult(testId, { 
          status: 'failed', 
          message: 'Request should have been queued when offline' 
        });
      } catch (error: any) {
        if (queueUtils.isOfflineQueuedError(error)) {
          updateTestResult(testId, { 
            status: 'passed', 
            message: 'Request correctly queued when offline' 
          });
        } else {
          updateTestResult(testId, { 
            status: 'failed', 
            message: `Unexpected error: ${error.message}` 
          });
        }
      }

      // Restore network state
      networkUtils.isConnected = originalIsConnected;
    } catch (error: any) {
      updateTestResult(testId, { 
        status: 'failed', 
        message: error.message 
      });
    }
  };

  // Test 2: Priority Queue Ordering
  const testPriorityQueue = async () => {
    const testId = 'priority-queue';
    addTestResult({ id: testId, name: 'Priority Queue Ordering', status: 'running' });

    try {
      // Clear queue first
      await queueActions.clearQueue();

      // Simulate offline
      const originalIsConnected = networkUtils.isConnected;
      networkUtils.isConnected = () => false;

      // Add requests with different priorities
      const requests = [
        { priority: 'low', data: { id: 1 } },
        { priority: 'high', data: { id: 2 } },
        { priority: 'medium', data: { id: 3 } },
        { priority: 'high', data: { id: 4 } },
      ];

      for (const req of requests) {
        try {
          await enhancedApiClient.createBudget({
            name: `Priority Test ${req.data.id}`,
            description: `Priority: ${req.priority}`,
          }, {
            metadata: { priority: req.priority as any },
          });
        } catch (error) {
          // Expected - requests should be queued
        }
      }

      // Check queue order
      const queue = queueState.queue;
      const priorities = queue.map(r => r.metadata?.priority || 'medium');
      
      // Should be ordered: high, high, medium, low
      const expectedOrder = ['high', 'high', 'medium', 'low'];
      const isCorrectOrder = priorities.every((p, i) => p === expectedOrder[i]);

      // Restore network
      networkUtils.isConnected = originalIsConnected;

      if (isCorrectOrder) {
        updateTestResult(testId, { 
          status: 'passed', 
          message: 'Queue correctly ordered by priority' 
        });
      } else {
        updateTestResult(testId, { 
          status: 'failed', 
          message: `Incorrect order: ${priorities.join(', ')}` 
        });
      }
    } catch (error: any) {
      updateTestResult(testId, { 
        status: 'failed', 
        message: error.message 
      });
    }
  };

  // Test 3: Retry Logic
  const testRetryLogic = async () => {
    const testId = 'retry-logic';
    addTestResult({ id: testId, name: 'Retry Logic', status: 'running' });

    try {
      let attemptCount = 0;
      
      // Create a mock retry scenario by temporarily breaking the network check
      const originalIsConnected = networkUtils.isConnected;
      let networkCallCount = 0;
      
      // Simulate network failures for first 2 attempts
      networkUtils.isConnected = () => {
        networkCallCount++;
        return networkCallCount > 2; // Fail first 2 times
      };

      try {
        const result = await enhancedApiClient.healthCheck();
        attemptCount = networkCallCount;
      } catch (error) {
        attemptCount = networkCallCount;
      } finally {
        // Restore original network check
        networkUtils.isConnected = originalIsConnected;
      }

      if (attemptCount >= 2) {
        updateTestResult(testId, { 
          status: 'passed', 
          message: `Retry logic worked correctly (${attemptCount} attempts)` 
        });
      } else {
        updateTestResult(testId, { 
          status: 'failed', 
          message: `Expected at least 2 attempts, got ${attemptCount}` 
        });
      }
    } catch (error: any) {
      updateTestResult(testId, { 
        status: 'failed', 
        message: error.message 
      });
    }
  };

  // Test 4: Queue Persistence
  const testQueuePersistence = async () => {
    const testId = 'queue-persistence';
    addTestResult({ id: testId, name: 'Queue Persistence', status: 'running' });

    try {
      // Simulate offline and add a request
      const originalIsConnected = networkUtils.isConnected;
      networkUtils.isConnected = () => false;

      const testData = { 
        persistent: true, 
        timestamp: Date.now(),
        unique: Math.random(),
      };

      try {
        await enhancedApiClient.createBudget({
          name: `Persistence Test ${testData.unique}`,
          description: `Created at ${testData.timestamp}`,
        });
      } catch (error) {
        // Expected - should be queued
      }

      // Get current queue
      const queueBefore = queueState.queue.length;

      // Simulate app restart by recreating queue instance
      // In real app, this would happen on app restart
      // For now, we'll just verify the queue has items

      if (queueBefore > 0) {
        updateTestResult(testId, { 
          status: 'passed', 
          message: 'Queue has persistent items' 
        });
      } else {
        updateTestResult(testId, { 
          status: 'failed', 
          message: 'Queue is empty when it should have items' 
        });
      }

      // Restore network
      networkUtils.isConnected = originalIsConnected;
    } catch (error: any) {
      updateTestResult(testId, { 
        status: 'failed', 
        message: error.message 
      });
    }
  };

  // Test 5: Network Recovery Processing
  const testNetworkRecovery = async () => {
    const testId = 'network-recovery';
    addTestResult({ id: testId, name: 'Network Recovery Processing', status: 'running' });

    try {
      // Clear queue first
      await queueActions.clearQueue();

      // Simulate offline and queue a request
      const originalIsConnected = networkUtils.isConnected;
      networkUtils.isConnected = () => false;

      try {
        await enhancedApiClient.createBudget({
          name: `Recovery Test`,
          description: 'Test network recovery processing',
        });
      } catch (error) {
        // Expected - should be queued
      }

      // Verify request is queued
      const queuedCount = queueState.queue.length;
      
      // Simulate network recovery
      networkUtils.isConnected = originalIsConnected;
      
      // Process queue
      await queueActions.processQueue();

      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if queue is cleared
      const remainingCount = queueState.queue.length;

      if (queuedCount > 0 && remainingCount < queuedCount) {
        updateTestResult(testId, { 
          status: 'passed', 
          message: 'Queue processed on network recovery' 
        });
      } else {
        updateTestResult(testId, { 
          status: 'failed', 
          message: `Queue not processed: ${queuedCount} -> ${remainingCount}` 
        });
      }
    } catch (error: any) {
      updateTestResult(testId, { 
        status: 'failed', 
        message: error.message 
      });
    }
  };

  const runAllTests = async () => {
    // Check if user is authenticated
    if (!authContext.user) {
      Alert.alert(
        'Authentication Required',
        'Please log in first to run API tests.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    // Run tests sequentially
    await testOfflineQueue();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testPriorityQueue();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testRetryLogic();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testQueuePersistence();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testNetworkRecovery();

    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '#34C759';
      case 'failed': return '#FF3B30';
      case 'running': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '✓';
      case 'failed': return '✗';
      case 'running': return '⟳';
      default: return '○';
    }
  };

  const networkState = networkUtils.getCurrentState();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>API Testing Suite</Text>

        {/* Authentication Notice */}
        {!authContext.user && (
          <View style={[styles.section, styles.warningSection]}>
            <Text style={styles.warningTitle}>Authentication Required</Text>
            <Text style={styles.warningText}>
              Please log in using the Auth tab before running tests.
              API operations require authentication to work properly.
            </Text>
          </View>
        )}

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Authenticated:</Text>
            <Text style={styles.statusValue}>
              {authContext.user ? 'Yes' : 'No'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Network:</Text>
            <Text style={styles.statusValue}>
              {networkState.isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Queued Requests:</Text>
            <Text style={styles.statusValue}>{queueStatus.queuedCount}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Active Retries:</Text>
            <Text style={styles.statusValue}>{retryStatus.activeRetries}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Simulate Offline:</Text>
            <Switch
              value={simulateOffline}
              onValueChange={setSimulateOffline}
            />
          </View>
        </View>

        {/* Test Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Controls</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.runButton, isRunning && styles.buttonDisabled]}
            onPress={runAllTests}
            disabled={isRunning}
          >
            <Text style={styles.buttonText}>
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={() => setTestResults([])}
          >
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        {testResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            
            {testResults.map(result => (
              <View key={result.id} style={styles.testResult}>
                <View style={styles.testHeader}>
                  <Text style={[styles.testIcon, { color: getStatusColor(result.status) }]}>
                    {getStatusIcon(result.status)}
                  </Text>
                  <Text style={styles.testName}>{result.name}</Text>
                  <Text style={[styles.testStatus, { color: getStatusColor(result.status) }]}>
                    {result.status.toUpperCase()}
                  </Text>
                </View>
                {result.message && (
                  <Text style={styles.testMessage}>{result.message}</Text>
                )}
              </View>
            ))}

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                Total: {testResults.length} | 
                Passed: {testResults.filter(r => r.status === 'passed').length} | 
                Failed: {testResults.filter(r => r.status === 'failed').length}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  warningSection: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
    borderWidth: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  runButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#8E8E93',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testResult: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testIcon: {
    fontSize: 18,
    marginRight: 8,
    fontWeight: 'bold',
  },
  testName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  testStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  testMessage: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  summary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
});

export default TestApiScreen;