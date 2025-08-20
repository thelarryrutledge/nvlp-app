import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthContext } from '../contexts/AuthContext';
import SecureStorageService from '../services/secureStorage';

const HomeScreen = () => {
  const { signOut, isAuthenticated } = useAuthContext();

  const handleSignOut = async () => {
    try {
      console.log('🚪 User initiated sign out...');
      await signOut();
      console.log('✅ Sign out successful');
      // Navigation to login screen will happen automatically via App.tsx
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      Alert.alert(
        'Sign Out Failed',
        'There was an error signing out. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: handleSignOut,
        },
      ],
      { cancelable: true }
    );
  };

  const handleTestExpire = async (days: number) => {
    try {
      console.log(`⏰ Testing token expiration by setting last activity to ${days} days ago...`);
      
      // Get current tokens
      const tokens = await SecureStorageService.getAuthTokens();
      
      if (!tokens) {
        Alert.alert('Error', 'No tokens found to expire');
        return;
      }
      
      // Set last activity to specified days ago
      const daysAgoMs = Date.now() - (days * 24 * 60 * 60 * 1000);
      tokens.lastActivity = daysAgoMs;
      
      // Save the modified tokens
      await SecureStorageService.setAuthTokens(tokens);
      
      console.log(`✅ Token last activity set to:`, new Date(daysAgoMs).toISOString());
      
      const shouldExpire = days > 30;
      const message = shouldExpire 
        ? `Last activity has been set to ${days} days ago.\n\nNow close the app completely and reopen it. The app should automatically sign you out due to inactivity.`
        : `Last activity has been set to ${days} days ago.\n\nNow close the app completely and reopen it. You should remain signed in since it's within the 30-day limit.`;
      
      Alert.alert(
        'Test Expiration Set',
        message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Failed to set test expiration:', error);
      Alert.alert(
        'Error',
        'Failed to set test expiration. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Icon name="checkmark-circle" size={80} color="#4CAF50" />
        
        <Text style={styles.title}>Welcome to NVLP</Text>
        <Text style={styles.subtitle}>You are successfully authenticated!</Text>
        
        <View style={styles.statusCard}>
          <Icon name="shield-checkmark" size={24} color="#4CAF50" />
          <Text style={styles.statusText}>
            Authentication Status: {isAuthenticated ? 'Active' : 'Inactive'}
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={confirmSignOut}>
          <Icon name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testExpireButton} onPress={() => handleTestExpire(15)}>
          <Icon name="checkmark-circle-outline" size={24} color="#fff" />
          <Text style={styles.testExpireButtonText}>Test 15 Days (Stay Signed In)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.testExpireButton, styles.testExpire60Button]} onPress={() => handleTestExpire(60)}>
          <Icon name="close-circle-outline" size={24} color="#fff" />
          <Text style={styles.testExpireButtonText}>Test 60 Days (Auto Sign Out)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  testExpireButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testExpireButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  testExpire60Button: {
    backgroundColor: '#FF6B6B',
  },
});

export default HomeScreen;