/**
 * Test Authentication Screen
 * 
 * Temporary screen to test authentication token management functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Config from 'react-native-config';
import { useAuth, useAuthState } from '../context/AuthContext';
import { useTokenMonitor, useTokenExpirationWarning } from '../hooks/useTokenMonitor';
import { tokenManager } from '../services/auth/tokenManager';

export function TestAuthScreen() {
  const [email, setEmail] = useState('larryjrutledge@gmail.com');
  const [password, setPassword] = useState('Test1234!');
  const [loading, setLoading] = useState(false);
  
  const { login, logout, register, refreshToken } = useAuth();
  const { isAuthenticated, user } = useAuthState();
  const tokenState = useTokenMonitor();
  const expirationWarning = useTokenExpirationWarning(5); // 5 minute warning

  const handleLogin = async () => {
    setLoading(true);
    
    try {
      console.log('Attempting login with:', { email, password });
      const result = await login({ email, password });
      Alert.alert('Success', 'Logged in successfully!');
      console.log('Login result:', result);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Unknown error occurred');
      console.error('Login error:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await register({ email, password, displayName: email.split('@')[0] });
      Alert.alert('Success', 'Registered successfully!');
      console.log('Register result:', result);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Unknown error occurred');
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Success', 'Logged out successfully!');
    } catch (error: any) {
      Alert.alert('Logout Failed', error.message || 'Unknown error occurred');
      console.error('Logout error:', error);
    }
  };

  const handleRefreshToken = async () => {
    setLoading(true);
    try {
      await refreshToken();
      Alert.alert('Success', 'Token refreshed successfully!');
    } catch (error: any) {
      Alert.alert('Refresh Failed', error.message || 'Unknown error occurred');
      console.error('Refresh error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testTokenManager = async () => {
    const tokens = tokenManager.getCurrentTokens();
    const needsRefresh = tokenManager.needsRefresh();
    const accessToken = tokenManager.getAccessToken();
    const refreshTokenValue = tokenManager.getRefreshToken();
    const tokenUser = tokenManager.getUser();
    const expiration = tokenManager.getTokenExpiration();

    Alert.alert(
      'Token Manager State',
      `Has Tokens: ${tokens ? 'Yes' : 'No'}\n` +
      `Needs Refresh: ${needsRefresh ? 'Yes' : 'No'}\n` +
      `Access Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'None'}\n` +
      `Refresh Token: ${refreshTokenValue ? 'Present' : 'None'}\n` +
      `User: ${tokenUser ? tokenUser.email : 'None'}\n` +
      `Expires: ${expiration ? new Date(expiration).toLocaleString() : 'N/A'}`
    );
  };

  const formatTime = (ms: number | null) => {
    if (!ms || ms <= 0) return 'Expired';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Auth Token Management Test</Text>

      {/* Authentication Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        <Text style={styles.status}>
          Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
        </Text>
        {user && (
          <>
            <Text style={styles.info}>User: {user.email}</Text>
            <Text style={styles.info}>ID: {user.id}</Text>
          </>
        )}
      </View>

      {/* Token State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Token State</Text>
        <Text style={styles.info}>
          Valid: {tokenState.isTokenValid ? '✅ Yes' : '❌ No'}
        </Text>
        <Text style={styles.info}>
          Needs Refresh: {tokenState.needsRefresh ? '⚠️ Yes' : '✅ No'}
        </Text>
        <Text style={styles.info}>
          Time Until Expiry: {formatTime(tokenState.timeUntilExpiry)}
        </Text>
        {tokenState.expiresAt && (
          <Text style={styles.info}>
            Expires At: {new Date(tokenState.expiresAt).toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Expiration Warning */}
      {expirationWarning.shouldShowWarning && (
        <View style={[styles.section, styles.warning]}>
          <Text style={styles.warningText}>
            ⚠️ Token expires in {expirationWarning.minutesUntilExpiry} minutes!
          </Text>
        </View>
      )}

      {/* Login Form */}
      {!isAuthenticated && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Login / Register</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.buttonRow}>
            <Button title="Login" onPress={handleLogin} disabled={loading} />
            <Button title="Register" onPress={handleRegister} disabled={loading} />
          </View>
        </View>
      )}

      {/* Actions */}
      {isAuthenticated && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.buttonColumn}>
            <Button title="Logout" onPress={handleLogout} />
            <Button title="Refresh Token" onPress={handleRefreshToken} disabled={loading} />
            <Button title="Test Token Manager" onPress={testTokenManager} />
          </View>
        </View>
      )}

      {loading && <ActivityIndicator size="large" style={styles.loader} />}
    </ScrollView>
  );
}

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
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 5,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  buttonColumn: {
    gap: 10,
  },
  warning: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
  },
  warningText: {
    color: '#856404',
    fontSize: 16,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
});