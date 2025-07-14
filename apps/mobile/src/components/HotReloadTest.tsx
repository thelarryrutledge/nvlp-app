import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NVLPClient } from '@nvlp/client';

const HotReloadTest: React.FC = () => {
  const [count, setCount] = useState(0);
  const [lastUpdate] = useState(new Date().toLocaleTimeString());
  
  // Test shared client import
  const testClient = () => {
    console.log('Testing NVLPClient import...');
    console.log('NVLPClient type:', typeof NVLPClient);
    console.log('NVLPClient constructor:', NVLPClient);
    alert(`NVLPClient is ${typeof NVLPClient === 'function' ? 'available ✅' : 'not available ❌'}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Monorepo Hot Reload Demo</Text>
      <Text style={styles.counter}>Count: {count}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setCount(count + 1)}
      >
        <Text style={styles.buttonText}>Increment</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.clientButton]}
        onPress={testClient}
      >
        <Text style={styles.buttonText}>Test Client Import</Text>
      </TouchableOpacity>
      <Text style={styles.instructions}>
        🔥 Hot reload test - Component loaded at {lastUpdate}
      </Text>
      <Text style={styles.instructions}>
        📦 Testing monorepo package imports
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  counter: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  clientButton: {
    backgroundColor: '#28a745',
  },
});

export default HotReloadTest;