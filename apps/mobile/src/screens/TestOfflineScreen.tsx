/**
 * Test Offline Queue Screen
 * 
 * Screen for testing offline queue functionality
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
  RefreshControl,
  Switch,
} from 'react-native';
import { useOfflineQueue, useOfflineQueueStatus } from '../hooks/useOfflineQueue';
import { enhancedApiClient } from '../services/api/clientWrapper';
import { networkUtils } from '../services/api/networkUtils';
import { useAuth } from '../context/AuthContext';

export const TestOfflineScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const { state, actions, utils } = useOfflineQueue();
  const queueStatus = useOfflineQueueStatus();
  const auth = useAuth();

  const handleTestOfflineRequest = async () => {
    // Check if user is authenticated
    if (!auth.user) {
      Alert.alert(
        'Authentication Required',
        'Please log in first to test offline functionality.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    setLastError(null);

    try {
      // Make a test request that will be queued if offline
      // Using a real endpoint that would work when online
      await enhancedApiClient.createBudget({
        name: 'Test Offline Budget',
        description: 'Created during offline test',
      });

      Alert.alert('Success', 'Request completed successfully');
    } catch (error: any) {
      console.log('Test request error:', error);
      
      // Check if this is an offline queued error
      if (utils.isOfflineQueuedError(error)) {
        const queueInfo = utils.getQueuedRequestInfo(error);
        Alert.alert(
          'Request Queued',
          `Your request has been queued and will be sent when you're back online.\n\nRequest ID: ${queueInfo?.requestId}`
        );
      } else {
        setLastError(error.message);
        Alert.alert('Error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestHighPriorityRequest = async () => {
    // Check if user is authenticated
    if (!auth.user) {
      Alert.alert(
        'Authentication Required',
        'Please log in first to test offline functionality.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    setLastError(null);

    try {
      // Using updateProfile as a high priority request example
      await enhancedApiClient.updateProfile({
        display_name: `Test User ${Date.now()}`,
        metadata: {
          test: true,
          priority: 'high',
        },
      });

      Alert.alert('Success', 'High priority request completed');
    } catch (error: any) {
      if (utils.isOfflineQueuedError(error)) {
        Alert.alert('High Priority Request Queued', 'This high priority request will be processed first when online');
      } else {
        setLastError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearQueue = async () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear all queued requests?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await actions.clearQueue();
            Alert.alert('Success', 'Queue cleared');
          },
        },
      ]
    );
  };

  const handleProcessQueue = async () => {
    await actions.processQueue();
    Alert.alert('Processing', 'Attempting to process queued requests');
  };

  // Handle simulate offline toggle
  const handleSimulateOfflineToggle = (value: boolean) => {
    setSimulateOffline(value);
    networkUtils.setForceOffline(value);
  };

  const renderQueueItem = (request: any) => (
    <View key={request.id} style={styles.queueItem}>
      <View style={styles.queueItemHeader}>
        <Text style={styles.queueMethod}>{request.method}</Text>
        <Text style={styles.queuePriority}>
          {request.metadata?.priority || 'medium'}
        </Text>
      </View>
      <Text style={styles.queueUrl}>{request.url}</Text>
      <Text style={styles.queueTime}>
        Queued: {utils.formatQueuedTime(request.timestamp)}
      </Text>
      <Text style={styles.queueRetries}>
        Retries: {request.retryCount}/{request.maxRetries}
      </Text>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => actions.removeRequest(request.id)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const networkState = networkUtils.getCurrentState();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              // Refresh would reload the queue state
            }}
          />
        }
      >
        <Text style={styles.title}>Offline Queue Test</Text>
        
        {/* Auth Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Status</Text>
          <Text style={styles.authStatus}>
            {auth.user ? `Logged in as: ${auth.user.email}` : 'Not authenticated'}
          </Text>
          {!auth.user && (
            <Text style={styles.authWarning}>
              Please log in using the Auth tab to test offline functionality
            </Text>
          )}
        </View>
        
        {/* Network Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Simulate Offline:</Text>
            <Switch
              value={simulateOffline}
              onValueChange={handleSimulateOfflineToggle}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={simulateOffline ? '#007AFF' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.networkStatus}>
            Connected: {String(networkState.isConnected)}
          </Text>
          <Text style={styles.networkStatus}>
            Internet Reachable: {String(networkState.isInternetReachable)}
          </Text>
          <Text style={styles.networkStatus}>
            Type: {networkState.type || 'unknown'}
          </Text>
          {simulateOffline && (
            <Text style={styles.offlineNote}>
              ⚠️ Offline mode simulated - requests will be queued
            </Text>
          )}
        </View>

        {/* Queue Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Queue Status</Text>
          <Text style={styles.queueStat}>
            Total Requests: {queueStatus.queuedCount}
          </Text>
          <Text style={styles.queueStat}>
            Processing: {String(queueStatus.isProcessing)}
          </Text>
          {queueStatus.oldestRequest && (
            <Text style={styles.queueStat}>
              Oldest: {utils.formatQueuedTime(queueStatus.oldestRequest)}
            </Text>
          )}
        </View>

        {/* Priority Breakdown */}
        {Object.keys(queueStatus.priorityBreakdown).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Priority Breakdown</Text>
            {Object.entries(queueStatus.priorityBreakdown).map(([priority, count]) => (
              <Text key={priority} style={styles.queueStat}>
                {priority}: {count}
              </Text>
            ))}
          </View>
        )}

        {/* Test Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleTestOfflineRequest}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Offline Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.highPriorityButton, isLoading && styles.buttonDisabled]}
            onPress={handleTestHighPriorityRequest}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test High Priority Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.processButton]}
            onPress={handleProcessQueue}
          >
            <Text style={styles.buttonText}>Process Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClearQueue}
          >
            <Text style={styles.buttonText}>Clear Queue</Text>
          </TouchableOpacity>
        </View>

        {/* Error Display */}
        {lastError && (
          <View style={styles.errorSection}>
            <Text style={styles.errorTitle}>Last Error:</Text>
            <Text style={styles.errorText}>{lastError}</Text>
          </View>
        )}

        {/* Queue Items */}
        {state.queue.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Queued Requests</Text>
            {state.queue.map(renderQueueItem)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  authStatus: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  authWarning: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
    marginTop: 4,
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
  offlineNote: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 8,
    fontStyle: 'italic',
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
  networkStatus: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  queueStat: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  highPriorityButton: {
    backgroundColor: '#FF9500',
  },
  processButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorSection: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
  },
  queueItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  queueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  queueMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  queuePriority: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: '#666',
  },
  queueUrl: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  queueTime: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  queueRetries: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TestOfflineScreen;