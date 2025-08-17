import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { env } from '../config/env';
import reactotron from '../config/reactotron';

/**
 * Development panel for Reactotron interaction
 * Only rendered in development mode
 */
export const ReactotronDevPanel: React.FC = () => {
  const [logMessage, setLogMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (env.NODE_ENV !== 'development') {
    return null;
  }

  const handleSendLog = () => {
    if (!logMessage.trim()) {
      Alert.alert('Error', 'Please enter a message to log');
      return;
    }

    reactotron.log(`📝 User Message: ${logMessage}`);
    setLogMessage('');
    Alert.alert('Success', 'Message sent to Reactotron!');
  };

  const handleSendError = () => {
    reactotron.error('🧪 Test error from dev panel', new Error('This is a test error'));
    Alert.alert('Success', 'Test error sent to Reactotron!');
  };

  const handleSendWarning = () => {
    reactotron.warn('⚠️ Test warning from dev panel');
    Alert.alert('Success', 'Test warning sent to Reactotron!');
  };

  const handleBenchmarkTest = () => {
    const stop = reactotron.benchmark('Test Benchmark');
    
    // Simulate some work
    setTimeout(() => {
      const result = Array.from({ length: 1000 }, (_, i) => i * i).reduce((a, b) => a + b, 0);
      stop();
      reactotron.log(`📊 Benchmark result: ${result}`);
      Alert.alert('Benchmark Complete', 'Check Reactotron for timing results');
    }, 100);
  };

  const handleDisplayData = () => {
    const sampleData = {
      timestamp: new Date().toISOString(),
      userAgent: 'React Native App',
      platform: 'mobile',
      features: ['error-boundary', 'reactotron', 'secure-storage'],
      stats: {
        uptime: Math.floor(Date.now() / 1000),
        memoryUsage: 'Simulated data',
      },
    };

    reactotron.display({
      name: '📱 Sample App Data',
      value: sampleData,
      preview: 'App information and stats',
    });
    
    Alert.alert('Success', 'Sample data sent to Reactotron!');
  };

  const connectionStatus = reactotron.isAvailable() ? '🟢 Connected' : '🔴 Disconnected';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.title}>
          ⚛️ Reactotron Dev Panel {connectionStatus}
        </Text>
        <Text style={styles.expandIcon}>
          {isExpanded ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>
            Interact with Reactotron debugging tools
          </Text>

          {/* Custom Log Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send Custom Message</Text>
            <TextInput
              style={styles.textInput}
              value={logMessage}
              onChangeText={setLogMessage}
              placeholder="Enter message to send to Reactotron..."
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSendLog}
            >
              <Text style={styles.buttonText}>Send Log Message</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.errorButton]}
              onPress={handleSendError}
            >
              <Text style={styles.buttonText}>Send Test Error</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.warningButton]}
              onPress={handleSendWarning}
            >
              <Text style={styles.buttonText}>Send Test Warning</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={handleBenchmarkTest}
            >
              <Text style={styles.buttonText}>Run Benchmark Test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={handleDisplayData}
            >
              <Text style={styles.buttonText}>Display Sample Data</Text>
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructionText}>
              1. Make sure Reactotron desktop app is running
            </Text>
            <Text style={styles.instructionText}>
              2. Connect to localhost:9090 (or your machine's IP for device testing)
            </Text>
            <Text style={styles.instructionText}>
              3. Use the custom commands in Reactotron's command palette
            </Text>
            <Text style={styles.instructionText}>
              4. Monitor network requests, state changes, and errors
            </Text>
          </View>

          {!reactotron.isAvailable() && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ Reactotron is not connected. Make sure the desktop app is running and try reloading the app.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007bff',
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    flex: 1,
  },
  expandIcon: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  content: {
    maxHeight: 400,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    minHeight: 40,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  errorButton: {
    backgroundColor: '#dc3545',
  },
  warningButton: {
    backgroundColor: '#ffc107',
  },
  infoButton: {
    backgroundColor: '#17a2b8',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  instructionText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    paddingLeft: 8,
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    margin: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
});

export default ReactotronDevPanel;