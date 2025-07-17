import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NVLPClient, type NVLPClientConfig, type AuthState, type UserProfile } from '@nvlp/client';

const HotReloadTest: React.FC = () => {
  const [count, setCount] = useState(0);
  const [lastUpdate] = useState(new Date().toLocaleTimeString());
  const [clientStatus, setClientStatus] = useState('Not tested');
  const [clientInstance, setClientInstance] = useState<NVLPClient | null>(null);
  
  // Test shared client import and instantiation
  const testClientImport = () => {
    console.log('Testing NVLPClient import...');
    console.log('NVLPClient type:', typeof NVLPClient);
    
    if (typeof NVLPClient === 'function') {
      setClientStatus('✅ Import successful');
      alert('NVLPClient import successful ✅');
    } else {
      setClientStatus('❌ Import failed');
      alert('NVLPClient import failed ❌');
    }
  };

  // Test client instantiation
  const testClientInstantiation = () => {
    try {
      const config: NVLPClientConfig = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-key',
        transport: 'edge-function'
      };
      
      const client = new NVLPClient(config);
      setClientInstance(client);
      setClientStatus('✅ Client instantiated');
      console.log('NVLPClient instantiated successfully:', client);
      alert('NVLPClient instantiation successful ✅');
    } catch (error) {
      setClientStatus('❌ Instantiation failed');
      console.error('Failed to instantiate NVLPClient:', error);
      alert(`NVLPClient instantiation failed: ${error}`);
    }
  };

  // Test client methods
  const testClientMethods = () => {
    if (!clientInstance) {
      alert('Please instantiate client first');
      return;
    }

    try {
      // Test method availability
      const methodsToTest = [
        'isAuthenticated',
        'getAuthState', 
        'healthCheck',
        'login',
        'logout'
      ];

      const availableMethods = methodsToTest.filter(method => 
        typeof clientInstance[method as keyof NVLPClient] === 'function'
      );

      console.log('Available client methods:', availableMethods);
      setClientStatus(`✅ ${availableMethods.length}/${methodsToTest.length} methods available`);
      alert(`Client methods available: ${availableMethods.length}/${methodsToTest.length} ✅`);
    } catch (error) {
      setClientStatus('❌ Method test failed');
      console.error('Failed to test client methods:', error);
      alert(`Method test failed: ${error}`);
    }
  };

  // Test shared types
  const testSharedTypes = () => {
    try {
      // Test that types are available and can be used
      const testAuthState: AuthState = {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        user: null
      };

      const testUserProfile: Partial<UserProfile> = {
        display_name: 'Test User',
        timezone: 'UTC',
        currency_code: 'USD'
      };

      console.log('Shared types test:', { testAuthState, testUserProfile });
      setClientStatus('✅ Shared types accessible');
      alert('Shared types (AuthState, UserProfile) accessible ✅');
    } catch (error) {
      setClientStatus('❌ Types test failed');
      console.error('Failed to test shared types:', error);
      alert(`Types test failed: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚀 Monorepo Client Library Test</Text>
        
        {/* Counter test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hot Reload Test</Text>
          <Text style={styles.counter}>Count: {count}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setCount(count + 1)}
          >
            <Text style={styles.buttonText}>Increment</Text>
          </TouchableOpacity>
          <Text style={styles.status}>Component loaded at {lastUpdate}</Text>
        </View>

        {/* Client library tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Library Tests</Text>
          <Text style={styles.status}>Status: {clientStatus}</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={testClientImport}
          >
            <Text style={styles.buttonText}>1. Test Import</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={testClientInstantiation}
          >
            <Text style={styles.buttonText}>2. Test Instantiation</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={testClientMethods}
          >
            <Text style={styles.buttonText}>3. Test Methods</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={testSharedTypes}
          >
            <Text style={styles.buttonText}>4. Test Shared Types</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instructions}>
          📦 Testing @nvlp/client package integration
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  counter: {
    fontSize: 18,
    marginBottom: 15,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
});

export default HotReloadTest;