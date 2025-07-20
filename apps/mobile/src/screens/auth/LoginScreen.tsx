/**
 * Login Screen
 * 
 * Handles user authentication with email and password
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Button, TextInput as ThemedTextInput, Card } from '../../components/ui';
import { rememberMeService } from '../../services/auth/rememberMeService';
import type { Theme } from '../../theme';
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
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const { login, getBiometricCapabilities, authenticateWithBiometrics } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  const emailInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);

  // Check biometric capabilities and load remember me preference on mount
  useEffect(() => {
    const initializeScreen = async () => {
      try {
        // Check biometric capabilities
        const capabilities = await getBiometricCapabilities();
        setBiometricCapabilities(capabilities);
        
        // Load remember me preference
        const preference = await rememberMeService.getPreference();
        if (preference && preference.rememberMe) {
          setEmail(preference.email);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Error initializing login screen:', error);
      }
    };
    
    initializeScreen();
  }, [getBiometricCapabilities]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      // Pass rememberMe flag to login - this will save credentials for biometric auth if enabled
      await login({ email: email.trim(), password }, rememberMe);
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

          <Card variant="elevated" padding="large" style={styles.formCard}>
            <ThemedTextInput
              ref={emailInputRef}
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              editable={!isLoading}
            />

            <ThemedTextInput
              ref={passwordInputRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              leftIcon="lock-closed"
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Icon name="checkmark" size={16} color={theme.textOnPrimary} />
                )}
              </View>
              <Text style={styles.rememberMeText}>Remember me for biometric login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={navigateToForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
            />

            {biometricCapabilities?.isAvailable && biometricCapabilities?.hasCredentials && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Button
                  title={getBiometricButtonText()}
                  onPress={handleBiometricLogin}
                  variant="outline"
                  icon={getBiometricIcon()}
                  loading={isBiometricLoading}
                  disabled={isLoading || isBiometricLoading}
                  fullWidth
                />
              </>
            )}
          </Card>

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

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.lg,
    },
    header: {
      alignItems: 'center' as const,
      marginBottom: spacing['3xl'],
    },
    title: {
      ...typography.h1,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center' as const,
    },
    formCard: {
      marginBottom: spacing['3xl'],
    },
    rememberMeContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 4,
      marginRight: spacing.sm,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: theme.surface,
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    rememberMeText: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      flex: 1,
    },
    forgotPasswordButton: {
      alignSelf: 'flex-end' as const,
      marginBottom: spacing.lg,
    },
    forgotPasswordText: {
      ...typography.bodySmall,
      color: theme.primary,
      fontWeight: '600' as const,
    },
    footer: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    footerText: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      marginRight: spacing.xs,
    },
    registerLink: {
      ...typography.bodySmall,
      color: theme.primary,
      fontWeight: '600' as const,
    },
    divider: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginVertical: spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      ...typography.caption,
      color: theme.textTertiary,
      marginHorizontal: spacing.md,
    },
  });
}

export default LoginScreen;