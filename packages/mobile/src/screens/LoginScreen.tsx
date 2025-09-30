import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../contexts/AuthContext';
import useAuthStore from '../store/authStore';
import supabaseClient from '../services/supabaseClient';
import reactotron from '../config/reactotron';
import SecureStorageService from '../services/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isAuthenticated, error } = useAuthContext();
  const authStore = useAuthStore();
  
  // Debug logging
  React.useEffect(() => {
    console.log('📱 LoginScreen render - Auth state:', {
      isAuthenticated,
      error
    });
  }, [isAuthenticated, error]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      if (isSignUp) {
        reactotron.log('📝 Signing up user:', email);
        await authStore.signUpWithEmailPassword(email, password);
        
        Alert.alert(
          'Check Your Email',
          `We've sent a verification email to ${email}. Please verify your email before signing in.`,
          [{ text: 'OK', onPress: () => setIsSignUp(false) }]
        );
        
        // Clear fields
        setEmail('');
        setPassword('');
      } else {
        reactotron.log('🔑 Signing in user:', email);
        await authStore.signInWithEmailPassword(email, password);
        
        // If successful, auth state will be updated and user will be redirected
        reactotron.log('✅ Sign in successful');
      }
    } catch (error) {
      reactotron.error('Authentication failed:', error as Error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      
      if (errorMessage.includes('Email not confirmed') || errorMessage.includes('EMAIL_NOT_VERIFIED')) {
        Alert.alert(
          'Email Not Verified',
          'Please check your email and verify your account before signing in.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Check Your Email',
          `We've sent a password reset link to ${email}.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email');
    }
  };

  // If already authenticated, show welcome message
  if (isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.email}>User authenticated</Text>
          <Text style={styles.successMessage}>
            You are successfully authenticated
          </Text>
          <Text style={styles.debugText}>
            Authentication: Valid
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>NVLP</Text>
          <Text style={styles.subtitle}>Virtual Envelope Budgeting</Text>
          
          <View style={styles.form}>
            <Text style={styles.label}>
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>
            
            {!isSignUp && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </Text>
              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                disabled={isLoading}
              >
                <Text style={styles.switchLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Clear Storage button for debugging */}
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#9B59B6', marginTop: 10 }]}
                onPress={async () => {
                  try {
                    console.log('🗑️ Clearing all stored tokens and data...');
                    
                    // Clear secure storage
                    await SecureStorageService.clearAll();
                    
                    // Clear all AsyncStorage (nuclear option)
                    await AsyncStorage.clear();
                    
                    console.log('✅ All storage cleared successfully');
                    Alert.alert(
                      'Storage Cleared', 
                      'All tokens and cached data have been cleared. You can now try a fresh sign-in.',
                      [{ text: 'OK' }]
                    );
                  } catch (error) {
                    console.error('❌ Error clearing storage:', error);
                    Alert.alert('Error', 'Failed to clear storage: ' + (error as Error).message);
                  }
                }}
              >
                <Text style={styles.buttonText}>Clear All Storage (Debug)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Debug info */}
          {__DEV__ && error && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Error: {error}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F9F9F9',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  email: {
    fontSize: 18,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  successMessage: {
    fontSize: 16,
    color: '#34C759',
    textAlign: 'center',
  },
  debugInfo: {
    marginTop: 30,
    padding: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  linkButton: {
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  switchText: {
    color: '#666',
    fontSize: 14,
    marginRight: 5,
  },
  switchLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;