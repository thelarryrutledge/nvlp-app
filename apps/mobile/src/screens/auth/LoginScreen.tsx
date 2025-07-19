/**
 * Login Screen
 * 
 * Handles user authentication with email and password
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import type { BiometricCapabilities } from '../../services/auth/biometricService';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const { login, getBiometricCapabilities, authenticateWithBiometrics } = useAuth();
  
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Check biometric capabilities on mount
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const capabilities = await getBiometricCapabilities();
        setBiometricCapabilities(capabilities);
      } catch (error) {
        console.error('Error checking biometric capabilities:', error);
      }
    };
    
    checkBiometrics();
  }, [getBiometricCapabilities]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      // Navigation will be handled by the AuthContext/navigation system
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'Unable to log in. Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleBiometricLogin = async () => {
    console.log('Biometric login attempt - capabilities:', biometricCapabilities);
    
    if (!biometricCapabilities?.isAvailable || !biometricCapabilities?.hasCredentials) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Please set up biometric authentication in your device settings and enable it in the app after logging in.'
      );
      return;
    }

    setIsBiometricLoading(true);
    try {
      console.log('Calling authenticateWithBiometrics...');
      const result = await authenticateWithBiometrics();
      console.log('Biometric auth result:', result);
      
      if (!result.success) {
        if (result.error && !result.error.includes('cancelled')) {
          Alert.alert('Biometric Authentication Failed', result.error);
        }
      }
      // If successful, AuthContext will handle navigation automatically
    } catch (error: any) {
      console.error('Biometric login error:', error);
      Alert.alert(
        'Biometric Login Failed',
        error.message || 'Unable to authenticate with biometrics. Please try again.'
      );
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (!biometricCapabilities?.biometryType) return 'finger-print';
    
    switch (biometricCapabilities.biometryType) {
      case 'TouchID':
        return 'finger-print';
      case 'FaceID':
        return 'scan';
      case 'Biometrics':
        return 'finger-print';
      default:
        return 'finger-print';
    }
  };

  const getBiometricButtonText = () => {
    if (!biometricCapabilities?.biometryType) return 'Use Biometric';
    
    switch (biometricCapabilities.biometryType) {
      case 'TouchID':
        return 'Use Touch ID';
      case 'FaceID':
        return 'Use Face ID';
      case 'Biometrics':
        return 'Use Fingerprint';
      default:
        return 'Use Biometric';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your NVLP account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Icon 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={22} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={navigateToForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {biometricCapabilities?.isAvailable && biometricCapabilities?.hasCredentials && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.biometricButton, isBiometricLoading && styles.biometricButtonDisabled]}
                  onPress={handleBiometricLogin}
                  disabled={isLoading || isBiometricLoading}
                >
                  {isBiometricLoading ? (
                    <ActivityIndicator color="#007AFF" size="small" />
                  ) : (
                    <>
                      <Icon 
                        name={getBiometricIcon()} 
                        size={24} 
                        color="#007AFF" 
                        style={styles.biometricIcon}
                      />
                      <Text style={styles.biometricButtonText}>{getBiometricButtonText()}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={navigateToRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  passwordToggle: {
    padding: 12,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  registerLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e5e9',
  },
  dividerText: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
  },
  biometricButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  biometricButtonDisabled: {
    opacity: 0.6,
  },
  biometricIcon: {
    marginRight: 8,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default LoginScreen;