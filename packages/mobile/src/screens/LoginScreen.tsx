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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../contexts/AuthContext';
import supabaseClient from '../services/supabaseClient';
import reactotron from '../config/reactotron';
import DeepLinkService from '../services/deepLinkService';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { magicLink, isAuthenticated, user } = useAuthContext();

  const handleSendMagicLink = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      reactotron.log('📧 Sending magic link to:', email);
      
      const result = await supabaseClient.sendMagicLink(email);
      
      if (result.success) {
        Alert.alert(
          'Check Your Email',
          `We've sent a magic link to ${email}. Click the link in the email to sign in.`,
          [{ text: 'OK' }]
        );
        
        // Clear email field
        setEmail('');
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to send magic link. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      reactotron.error('Failed to send magic link:', error as Error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated, show welcome message
  if (isAuthenticated && user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.successMessage}>
            You are successfully authenticated
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
            <Text style={styles.label}>Sign in with your email</Text>
            
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
            
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendMagicLink}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Send Magic Link</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.helpText}>
              We'll send you a secure link to sign in without a password.
            </Text>
            
            {/* Test button for debugging */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#FF6B6B', marginTop: 20 }]}
              onPress={() => {
                const testUrl = 'nvlp://auth/callback#access_token=test_token&refresh_token=test_refresh&expires_in=3600&token_type=bearer&type=magiclink';
                console.log('🧪 Testing by directly calling DeepLinkService...');
                
                // Directly call the DeepLinkService to simulate receiving a deep link
                // @ts-ignore - accessing private method for testing
                DeepLinkService.handleURL(testUrl);
                
                Alert.alert('Test', 'Check console for deep link processing logs');
              }}
            >
              <Text style={styles.buttonText}>Test Direct Handler (Debug)</Text>
            </TouchableOpacity>
          </View>

          {/* Debug info */}
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              Magic Link Ready: {magicLink.isReady ? '✅' : '❌'}
            </Text>
            <Text style={styles.debugText}>
              Redirect URL: {magicLink.getRedirectURL()}
            </Text>
            <Text style={styles.debugText}>
              Stats: {JSON.stringify(magicLink.getStats(), null, 2)}
            </Text>
          </View>
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
});

export default LoginScreen;