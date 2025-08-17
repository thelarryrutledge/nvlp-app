import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import SecureStorageService from '../services/secureStorage';
import LocalStorageService, { DEFAULT_USER_PREFERENCES } from '../services/localStorage';
// Temporarily disabled until reanimated is fixed
// import AnimatedCard from '../components/AnimatedCard';
// import AnimationShowcase from '../components/AnimationShowcase';

const HomeScreen = () => {
  const [biometricInfo, setBiometricInfo] = useState<string>('Checking...');
  const [storedData, setStoredData] = useState<{
    secureData?: string;
    asyncData?: string;
  }>({});

  useEffect(() => {
    checkBiometricAvailability();
    loadStoredData();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const biometric = await SecureStorageService.isBiometricAvailable();
      setBiometricInfo(`Available: ${biometric.availableType}`);
    } catch (error) {
      setBiometricInfo('Error checking biometric availability');
    }
  };

  const loadStoredData = async () => {
    try {
      // Check for previously stored secure data
      const tokens = await SecureStorageService.getAuthTokens();
      const prefs = await LocalStorageService.getUserPreferences();
      
      setStoredData({
        secureData: tokens ? `Token saved at: ${new Date(tokens.expiresAt - 3600000).toLocaleString()}` : 'No secure data found',
        asyncData: prefs ? `Theme: ${prefs.theme}, Currency: ${prefs.currency}` : 'No preferences found',
      });
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  };

  const testSecureStorage = async () => {
    try {
      const now = new Date();
      const testTokens = {
        accessToken: `secure-token-${now.getTime()}`,
        refreshToken: `refresh-token-${now.getTime()}`,
        expiresAt: now.getTime() + 3600000, // 1 hour
        userId: `user-${now.getTime()}`,
      };

      await SecureStorageService.setAuthTokens(testTokens);
      const retrievedTokens = await SecureStorageService.getAuthTokens();
      
      if (retrievedTokens && retrievedTokens.accessToken === testTokens.accessToken) {
        Alert.alert(
          'Secure Storage Test', 
          `✅ Token stored successfully!\n\nSaved at: ${now.toLocaleString()}\n\nRestart the app to verify persistence across sessions.`
        );
        // Update the displayed stored data
        await loadStoredData();
      } else {
        Alert.alert('Error', 'Failed to retrieve stored tokens');
      }
    } catch (error) {
      Alert.alert('Error', `Secure storage test failed: ${error}`);
    }
  };

  const testAsyncStorage = async () => {
    try {
      const now = new Date();
      const testPrefs = {
        ...DEFAULT_USER_PREFERENCES,
        theme: 'dark' as const,
        currency: 'EUR',
        language: 'en',
        notifications: {
          ...DEFAULT_USER_PREFERENCES.notifications,
          enabled: true,
        },
        privacy: {
          ...DEFAULT_USER_PREFERENCES.privacy,
          analytics: false,
        },
      };

      // Also store a timestamp to track when this was saved
      await LocalStorageService.setUserPreferences(testPrefs);
      await LocalStorageService.setCachedData('test-timestamp', now.toISOString());
      
      const retrievedPrefs = await LocalStorageService.getUserPreferences();
      const timestamp = await LocalStorageService.getCachedData<string>('test-timestamp');
      
      if (retrievedPrefs && retrievedPrefs.theme === 'dark' && retrievedPrefs.currency === 'EUR') {
        Alert.alert(
          'AsyncStorage Test', 
          `✅ Preferences stored successfully!\n\nTheme: ${retrievedPrefs.theme}\nCurrency: ${retrievedPrefs.currency}\nSaved at: ${now.toLocaleString()}\n\nRestart the app to verify persistence across sessions.`
        );
        // Update the displayed stored data
        await loadStoredData();
      } else {
        Alert.alert('Error', 'Failed to retrieve stored preferences');
      }
    } catch (error) {
      Alert.alert('Error', `AsyncStorage test failed: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Icon name="speedometer-outline" size={32} color="#333" style={styles.headerIcon} />
          <Text style={styles.title}>NVLP Dashboard</Text>
          <Text style={styles.subtitle}>Virtual Envelope Budgeting</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome to NVLP</Text>
          <Text style={styles.cardSubtitle}>
            Your personal finance dashboard
          </Text>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.description}>
            Welcome to your personal finance dashboard. Here you'll see your
            budget overview, recent transactions, and account summaries.
          </Text>
        </View>

        <View style={styles.placeholderBox}>
          <Icon name="stats-chart-outline" size={24} color="#999" />
          <Text style={styles.placeholderText}>
            Budget Overview Coming Soon
          </Text>
        </View>
        
        <View style={styles.placeholderBox}>
          <Icon name="list-outline" size={24} color="#999" />
          <Text style={styles.placeholderText}>
            Recent Transactions Coming Soon
          </Text>
        </View>

        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>💾 Storage Test & Persistence</Text>
          <Text style={styles.biometricInfo}>Biometric: {biometricInfo}</Text>
          
          {/* Display previously stored data */}
          <View style={styles.storedDataSection}>
            <Text style={styles.storedDataTitle}>📱 Data from Previous Sessions:</Text>
            <Text style={styles.storedDataText}>
              🔐 Secure: {storedData.secureData}
            </Text>
            <Text style={styles.storedDataText}>
              💾 AsyncStorage: {storedData.asyncData}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.testButton} onPress={testSecureStorage}>
            <Icon name="shield-checkmark-outline" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Save Secure Token</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.testButton, styles.asyncButton]} onPress={testAsyncStorage}>
            <Icon name="archive-outline" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerIcon: {
    marginBottom: 8,
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  description: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  placeholderBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 30,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  securitySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  biometricInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  asyncButton: {
    backgroundColor: '#34C759',
    marginTop: 8,
  },
  storedDataSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  storedDataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  storedDataText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    fontFamily: 'Menlo', // Monospace font for better readability
  },
});

export default HomeScreen;