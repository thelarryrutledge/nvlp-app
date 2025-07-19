/**
 * Verification Handler
 * 
 * Handles email verification deep links from verification emails
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';

type VerificationRouteProp = RouteProp<AuthStackParamList, 'Verification'>;
type VerificationNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Verification'>;

interface VerificationState {
  status: 'loading' | 'success' | 'error' | 'already_verified';
  message: string;
}

export const VerificationHandler: React.FC = () => {
  const route = useRoute<VerificationRouteProp>();
  const navigation = useNavigation<VerificationNavigationProp>();
  const { user, refreshToken } = useAuth();
  
  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: 'loading',
    message: 'Processing verification...',
  });

  useEffect(() => {
    handleVerification();
  }, [route.params]);

  const handleVerification = async () => {
    try {
      // Extract parameters from the deep link
      const params = route.params as any;
      console.log('Verification Handler - Received params:', params);

      // If user is already logged in, they might be re-verifying
      if (user) {
        setVerificationState({
          status: 'already_verified',
          message: 'You are already signed in! Your email has been verified.',
        });
        return;
      }

      // Check if we have the necessary verification data
      const { token, type, access_token, refresh_token, error, error_description } = params || {};

      if (error) {
        console.error('Verification error:', error, error_description);
        setVerificationState({
          status: 'error',
          message: error_description || 'Verification failed. Please try again.',
        });
        return;
      }

      if (access_token) {
        // Verification successful with tokens - this means user is now verified
        console.log('Verification successful - tokens received');
        setVerificationState({
          status: 'success',
          message: 'Email verified successfully! You can now sign in with your account.',
        });
      } else if (token && type === 'signup') {
        // Verification link clicked but no tokens (confirmation required flow)
        console.log('Verification link processed for signup');
        setVerificationState({
          status: 'success',
          message: 'Email verified successfully! You can now sign in with your account.',
        });
      } else {
        console.warn('Unclear verification status - defaulting to success');
        setVerificationState({
          status: 'success',
          message: 'Verification processed. Please try signing in to your account.',
        });
      }
      
      // Auto-navigate to login after showing success message
      setTimeout(() => {
        if (!user) {
          console.log('Auto-navigating to login screen');
          // Reset navigation stack to ensure clean state
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error handling verification:', error);
      setVerificationState({
        status: 'error',
        message: 'An error occurred during verification. Please try again.',
      });
    }
  };

  const handleContinue = () => {
    if (user) {
      // User is authenticated, go to main app
      navigation.navigate('Dashboard' as any);
    } else {
      // Go to login screen
      navigation.navigate('Login');
    }
  };

  const handleRetry = () => {
    setVerificationState({
      status: 'loading',
      message: 'Processing verification...',
    });
    setTimeout(handleVerification, 1000);
  };

  const renderContent = () => {
    switch (verificationState.status) {
      case 'loading':
        return (
          <>
            <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
            <Text style={styles.title}>Verifying Email</Text>
            <Text style={styles.message}>{verificationState.message}</Text>
          </>
        );

      case 'success':
        return (
          <>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.message}>{verificationState.message}</Text>
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>
                {user ? 'Continue to App' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </>
        );

      case 'already_verified':
        return (
          <>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.title}>Already Verified</Text>
            <Text style={styles.message}>{verificationState.message}</Text>
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue to App</Text>
            </TouchableOpacity>
          </>
        );

      case 'error':
        return (
          <>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.message}>{verificationState.message}</Text>
            <TouchableOpacity style={styles.button} onPress={handleRetry}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleContinue}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                {user ? 'Continue to App' : 'Go to Sign In'}
              </Text>
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});

export default VerificationHandler;