import React, { useState } from 'react';
import { StatusBar, useColorScheme, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { TestAuthScreen } from './src/screens/TestAuthScreen';
import { TestOfflineScreen } from './src/screens/TestOfflineScreen';
import { TestApiScreen } from './src/screens/TestApiScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<'auth' | 'offline' | 'api'>('auth');

  return (
    <AuthProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.container}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'auth' && styles.activeTab]}
            onPress={() => setActiveTab('auth')}
          >
            <Text style={[styles.tabText, activeTab === 'auth' && styles.activeTabText]}>
              Auth
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'offline' && styles.activeTab]}
            onPress={() => setActiveTab('offline')}
          >
            <Text style={[styles.tabText, activeTab === 'offline' && styles.activeTabText]}>
              Offline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'api' && styles.activeTab]}
            onPress={() => setActiveTab('api')}
          >
            <Text style={[styles.tabText, activeTab === 'api' && styles.activeTabText]}>
              API Tests
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'auth' && <TestAuthScreen />}
          {activeTab === 'offline' && <TestOfflineScreen />}
          {activeTab === 'api' && <TestApiScreen />}
        </View>
      </SafeAreaView>
    </AuthProvider>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

export default App;
