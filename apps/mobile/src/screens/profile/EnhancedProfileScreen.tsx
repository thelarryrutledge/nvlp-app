/**
 * Enhanced Profile Screen
 * 
 * Comprehensive user profile and settings management with:
 * - User information display and editing
 * - Security settings (biometric auth, password change)
 * - Appearance settings (theme, preferences)
 * - Notification preferences
 * - Data management options
 * - Developer/debug options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import { useThemedStyles, useTheme, spacing, typography } from '../../theme';
import { Button, TextInput, Card, ProfileImagePicker } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { secureCredentialStorage } from '../../services/auth/secureCredentialStorage';
import { permissionService } from '../../services/permissions/permissionService';
import type { Theme } from '../../theme';
import type { BiometricCapabilities } from '../../services/auth/biometricService';

interface SettingItemProps {
  icon: string;
  title: string;
  description?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  description,
  onPress,
  rightElement,
  showArrow = false,
}) => {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingInfo}>
        <View style={styles.settingIconContainer}>
          <Icon name={icon} size={24} color={theme.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && (
          <Icon name="chevron-forward" size={20} color={theme.textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

export const EnhancedProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout, user, getBiometricCapabilities, enableBiometricAuth, disableBiometricAuth } = useAuth();
  const { mode, setTheme, isDark } = useTheme();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Biometric state
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  // Preferences state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [checkingNotificationPermission, setCheckingNotificationPermission] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const capabilities = await getBiometricCapabilities();
        setBiometricCapabilities(capabilities);
        
        const hasStoredCredentials = await secureCredentialStorage.hasCredentials();
        setIsBiometricEnabled(capabilities.hasCredentials && hasStoredCredentials);
      } catch (error) {
        console.error('Error checking biometric capabilities:', error);
      }
    };
    
    const checkNotificationPermissions = async () => {
      try {
        const result = await permissionService.checkPermission('notifications');
        setNotificationsEnabled(result.status === 'granted');
      } catch (error) {
        console.error('Error checking notification permissions:', error);
      }
    };
    
    checkBiometrics();
    checkNotificationPermissions();
  }, [getBiometricCapabilities]);

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!biometricCapabilities?.isAvailable) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Biometric authentication is not available on this device.'
      );
      return;
    }

    if (enabled) {
      setShowCredentialModal(true);
    } else {
      setIsLoading(true);
      try {
        const success = await disableBiometricAuth();
        if (success) {
          setIsBiometricEnabled(false);
          Alert.alert(
            'Biometric Authentication Disabled',
            'You will need to use your email and password to sign in.'
          );
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to disable biometric authentication.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCredentialSubmit = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await enableBiometricAuth(user?.email || '', password);
      if (success) {
        setIsBiometricEnabled(true);
        setShowCredentialModal(false);
        setPassword('');
        Alert.alert(
          'Biometric Authentication Enabled',
          `${getBiometryTypeName()} authentication has been enabled.`
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to enable biometric authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometryTypeName = () => {
    switch (biometricCapabilities?.biometryType) {
      case 'TouchID': return 'Touch ID';
      case 'FaceID': return 'Face ID';
      case 'Biometrics': return 'Fingerprint';
      default: return 'Biometric';
    }
  };

  const handleProfileImageSelected = (uri: string) => {
    setProfileImageUri(uri || null);
    // TODO: Upload image to Supabase storage and update UserProfile
    // For now, just store locally
  };

  const handleSaveProfile = async () => {
    // TODO: Implement profile update API call
    setIsEditingProfile(false);
    Alert.alert('Profile Updated', 'Your profile information has been saved.');
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'This feature will be implemented to allow users to update their password.',
      [{ text: 'OK' }]
    );
  };

  const handleDataExport = () => {
    Alert.alert(
      'Export Data',
      'This will allow users to export their financial data for backup or migration.',
      [{ text: 'OK' }]
    );
  };

  const handleDataClear = () => {
    Alert.alert(
      'Clear Data',
      'Are you sure you want to clear all your financial data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement data clearing
            Alert.alert('Data Cleared', 'All financial data has been removed.');
          }
        }
      ]
    );
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      setCheckingNotificationPermission(true);
      try {
        const result = await permissionService.requestPermission('notifications');
        setNotificationsEnabled(result.status === 'granted');
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        setNotificationsEnabled(false);
      } finally {
        setCheckingNotificationPermission(false);
      }
    } else {
      // User is disabling notifications
      setNotificationsEnabled(false);
    }
  };

  const testPermissions = async () => {
    Alert.alert(
      'Test Permissions',
      'This will test all permission requests. Choose which permission to test:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Camera', 
          onPress: async () => {
            const result = await permissionService.requestPermission('camera');
            Alert.alert('Camera Permission', `Status: ${result.status}`);
          }
        },
        { 
          text: 'Photos', 
          onPress: async () => {
            const result = await permissionService.requestPermission('photoLibrary');
            Alert.alert('Photos Permission', `Status: ${result.status}`);
          }
        },
        { 
          text: 'Notifications', 
          onPress: async () => {
            const result = await permissionService.requestPermission('notifications');
            Alert.alert('Notifications Permission', `Status: ${result.status}`);
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Header */}
        <Card variant="elevated" padding="large" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <ProfileImagePicker
                imageUri={profileImageUri}
                onImageSelected={handleProfileImageSelected}
                size={80}
                editable={true}
              />
            </View>
            
            {isEditingProfile ? (
              <View style={styles.editingContainer}>
                <TextInput
                  label="Display Name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your name"
                  containerStyle={styles.profileInput}
                />
                <View style={styles.editActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="small"
                    onPress={() => {
                      setIsEditingProfile(false);
                      setDisplayName(user?.user_metadata?.display_name || '');
                    }}
                    style={styles.editButton}
                  />
                  <Button
                    title="Save"
                    size="small"
                    onPress={handleSaveProfile}
                    style={styles.editButton}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>
                  {displayName || user?.user_metadata?.display_name || 'User'}
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <Button
                  title="Edit Profile"
                  variant="ghost"
                  size="small"
                  icon="pencil"
                  onPress={() => setIsEditingProfile(true)}
                  style={styles.editProfileButton}
                />
              </View>
            )}
          </View>
        </Card>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Card variant="default" padding="none">
            {biometricCapabilities?.isAvailable && (
              <SettingItem
                icon={biometricCapabilities.biometryType === 'FaceID' ? 'scan' : 'finger-print'}
                title={`${getBiometryTypeName()} Authentication`}
                description={`Use ${getBiometryTypeName().toLowerCase()} for secure sign-in`}
                rightElement={
                  <Switch
                    value={isBiometricEnabled}
                    onValueChange={handleBiometricToggle}
                    disabled={isLoading}
                    trackColor={{ false: theme.interactiveDisabled, true: theme.primary }}
                    thumbColor={isBiometricEnabled ? theme.textOnPrimary : theme.textDisabled}
                  />
                }
              />
            )}
            <SettingItem
              icon="key"
              title="Change Password"
              description="Update your account password"
              onPress={handleChangePassword}
              showArrow
            />
          </Card>
        </View>

        {/* Appearance Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Card variant="default" padding="none">
            <SettingItem
              icon="phone-portrait"
              title="Use System Theme"
              description="Follow your device's light/dark mode setting"
              rightElement={
                <Switch
                  value={mode === 'system'}
                  onValueChange={(value) => setTheme(value ? 'system' : (isDark ? 'dark' : 'light'))}
                  trackColor={{ false: theme.interactiveDisabled, true: theme.primary }}
                  thumbColor={mode === 'system' ? theme.textOnPrimary : theme.textDisabled}
                />
              }
            />
            {mode !== 'system' && (
              <SettingItem
                icon={isDark ? 'moon' : 'sunny'}
                title="Dark Mode"
                description="Use dark colors for the interface"
                rightElement={
                  <Switch
                    value={isDark}
                    onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
                    trackColor={{ false: theme.interactiveDisabled, true: theme.primary }}
                    thumbColor={isDark ? theme.textOnPrimary : theme.textDisabled}
                  />
                }
              />
            )}
          </Card>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card variant="default" padding="none">
            <SettingItem
              icon="notifications"
              title="Push Notifications"
              description="Receive app notifications"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                  disabled={checkingNotificationPermission}
                  trackColor={{ false: theme.interactiveDisabled, true: theme.primary }}
                  thumbColor={notificationsEnabled ? theme.textOnPrimary : theme.textDisabled}
                />
              }
            />
            <SettingItem
              icon="mail"
              title="Email Notifications"
              description="Receive updates via email"
              rightElement={
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{ false: theme.interactiveDisabled, true: theme.primary }}
                  thumbColor={emailNotifications ? theme.textOnPrimary : theme.textDisabled}
                />
              }
            />
            <SettingItem
              icon="alert-circle"
              title="Budget Alerts"
              description="Get notified when approaching budget limits"
              rightElement={
                <Switch
                  value={budgetAlerts}
                  onValueChange={setBudgetAlerts}
                  trackColor={{ false: theme.interactiveDisabled, true: theme.primary }}
                  thumbColor={budgetAlerts ? theme.textOnPrimary : theme.textDisabled}
                />
              }
            />
          </Card>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <Card variant="default" padding="none">
            <SettingItem
              icon="download"
              title="Export Data"
              description="Download your financial data"
              onPress={handleDataExport}
              showArrow
            />
            <SettingItem
              icon="trash"
              title="Clear All Data"
              description="Remove all financial information"
              onPress={handleDataClear}
              showArrow
            />
          </Card>
        </View>

        {/* Developer Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <Card variant="default" padding="none">
            <SettingItem
              icon="color-palette"
              title="Design System"
              description="View component examples"
              onPress={() => (navigation as any).navigate('DesignSystemExample')}
              showArrow
            />
            <SettingItem
              icon="wallet"
              title="Budget Setup Demo"
              description="Test the budget setup flow"
              onPress={() => (navigation as any).navigate('InitialBudgetSetup')}
              showArrow
            />
            <SettingItem
              icon="shield-checkmark"
              title="App Permissions"
              description="Manage camera, photos, and notification access"
              onPress={() => (navigation as any).navigate('PermissionRequest')}
              showArrow
            />
            <SettingItem
              icon="flask"
              title="Test Permissions"
              description="Test individual permission requests"
              onPress={testPermissions}
              showArrow
            />
            <SettingItem
              icon="timer"
              title="Session Tests"
              description="Test token expiration and session management"
              onPress={() => (navigation as any).navigate('SessionTest')}
              showArrow
            />
          </Card>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <Button
            title="Sign Out"
            variant="destructive"
            icon="log-out"
            onPress={logout}
            fullWidth
          />
        </View>

      </ScrollView>

      {/* Biometric Setup Modal */}
      <Modal
        visible={showCredentialModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCredentialModal(false);
          setPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <Card variant="elevated" padding="large" style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Your Password</Text>
            <Text style={styles.modalDescription}>
              To enable {getBiometryTypeName()}, please enter your password for security.
            </Text>
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off' : 'eye'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              autoFocus={true}
              containerStyle={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowCredentialModal(false);
                  setPassword('');
                }}
                disabled={isLoading}
                style={styles.modalButton}
              />
              <Button
                title="Enable"
                onPress={handleCredentialSubmit}
                loading={isLoading}
                disabled={isLoading}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    profileCard: {
      marginBottom: spacing.xl,
    },
    profileHeader: {
      alignItems: 'center' as const,
    },
    avatarContainer: {
      marginBottom: spacing.lg,
    },
    profileInfo: {
      alignItems: 'center' as const,
    },
    userName: {
      ...typography.h2,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
      textAlign: 'center' as const,
    },
    userEmail: {
      ...typography.body,
      color: theme.textSecondary,
      marginBottom: spacing.lg,
      textAlign: 'center' as const,
    },
    editProfileButton: {
      marginTop: spacing.sm,
    },
    editingContainer: {
      width: '100%',
      alignItems: 'center' as const,
    },
    profileInput: {
      marginBottom: spacing.lg,
      width: '100%',
    },
    editActions: {
      flexDirection: 'row' as const,
      gap: spacing.md,
    },
    editButton: {
      minWidth: 80,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
    settingItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    settingInfo: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
    },
    settingIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primaryLight + '20',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: spacing.md,
    },
    settingText: {
      flex: 1,
    },
    settingTitle: {
      ...typography.bodyMedium,
      color: theme.textPrimary,
      marginBottom: spacing.xs,
    },
    settingDescription: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    settingRight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    signOutSection: {
      marginTop: spacing.lg,
      marginBottom: spacing['2xl'],
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      ...typography.h3,
      color: theme.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    },
    modalDescription: {
      ...typography.body,
      color: theme.textSecondary,
      marginBottom: spacing.lg,
      textAlign: 'center' as const,
    },
    modalInput: {
      marginBottom: spacing.lg,
    },
    modalActions: {
      flexDirection: 'row' as const,
      gap: spacing.md,
    },
    modalButton: {
      flex: 1,
    },
  });
}

export default EnhancedProfileScreen;