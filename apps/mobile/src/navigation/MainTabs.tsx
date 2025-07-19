/**
 * Main Tabs Navigator
 * 
 * Bottom tab navigation for main app features
 */

import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import type { MainTabParamList } from './types';
import type { BiometricCapabilities } from '../services/auth/biometricService';
import { secureCredentialStorage } from '../services/auth/secureCredentialStorage';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screens - these will be replaced with actual screens later
const DashboardScreen = () => {
  const { logout } = useAuth();
  
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Dashboard</Text>
      <Text style={styles.placeholderSubtext}>Welcome! You're logged in.</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const BudgetsScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Budgets</Text>
    <Text style={styles.placeholderSubtext}>Coming soon...</Text>
  </View>
);

const EnvelopesScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Envelopes</Text>
    <Text style={styles.placeholderSubtext}>Coming soon...</Text>
  </View>
);

const TransactionsScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>Transactions</Text>
    <Text style={styles.placeholderSubtext}>Coming soon...</Text>
  </View>
);

const ProfileScreen = () => {
  const { logout, user, getBiometricCapabilities, enableBiometricAuth, disableBiometricAuth } = useAuth();
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const capabilities = await getBiometricCapabilities();
        setBiometricCapabilities(capabilities);
        
        // Check if user has stored credentials
        const hasStoredCredentials = await secureCredentialStorage.hasCredentials();
        setIsBiometricEnabled(capabilities.hasCredentials && hasStoredCredentials);
      } catch (error) {
        console.error('Error checking biometric capabilities:', error);
      }
    };
    
    checkBiometrics();
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
      // Show credential modal to get password
      setShowCredentialModal(true);
    } else {
      // Disable biometric auth
      setIsLoading(true);
      try {
        const success = await disableBiometricAuth();
        if (success) {
          setIsBiometricEnabled(false);
          Alert.alert(
            'Biometric Authentication Disabled',
            'You will need to use your email and password to sign in.'
          );
        } else {
          Alert.alert(
            'Disable Failed',
            'Failed to disable biometric authentication. Please try again.'
          );
        }
      } catch (error: any) {
        Alert.alert(
          'Error',
          error.message || 'An error occurred while updating biometric settings.'
        );
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
          `${getBiometryTypeName()} authentication has been enabled for faster sign-in.`
        );
      } else {
        Alert.alert(
          'Setup Failed',
          'Failed to enable biometric authentication. Please check your password and try again.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'An error occurred while updating biometric settings.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometryTypeName = () => {
    if (!biometricCapabilities?.biometryType) return 'Biometric';
    
    switch (biometricCapabilities.biometryType) {
      case 'TouchID':
        return 'Touch ID';
      case 'FaceID':
        return 'Face ID';
      case 'Biometrics':
        return 'Fingerprint';
      default:
        return 'Biometric';
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

  return (
    <SafeAreaView style={styles.profileContainer}>
      <ScrollView style={styles.profileContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Icon name="person-circle" size={80} color="#007AFF" />
          </View>
          <Text style={styles.userName}>{user?.email || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Security Settings</Text>
          
          {biometricCapabilities?.isAvailable && (
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon 
                    name={getBiometricIcon()} 
                    size={24} 
                    color="#007AFF" 
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{getBiometryTypeName()} Authentication</Text>
                  <Text style={styles.settingDescription}>
                    Use {getBiometryTypeName().toLowerCase()} for faster and secure sign-in
                  </Text>
                </View>
              </View>
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={isLoading}
                trackColor={{ false: '#e1e5e9', true: '#007AFF' }}
                thumbColor={isBiometricEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>
          )}
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Icon name="log-out-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Password Modal for Biometric Setup */}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Your Password</Text>
            <Text style={styles.modalDescription}>
              To enable {getBiometryTypeName()}, please enter your password for security.
            </Text>
            
            <View style={styles.modalPasswordContainer}>
              <TextInput
                style={styles.modalPasswordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
              <TouchableOpacity
                style={styles.modalPasswordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={22} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCredentialModal(false);
                  setPassword('');
                }}
                disabled={isLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalConfirmButton, isLoading && styles.modalButtonDisabled]}
                onPress={handleCredentialSubmit}
                disabled={isLoading}
              >
                <Text style={styles.modalConfirmText}>
                  {isLoading ? 'Enabling...' : 'Enable'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTitleStyle: {
          color: '#fff',
          fontWeight: '600',
        },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e1e5e9',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{
          title: 'Budgets',
          tabBarLabel: 'Budgets',
        }}
      />
      <Tab.Screen
        name="Envelopes"
        component={EnvelopesScreen}
        options={{
          title: 'Envelopes',
          tabBarLabel: 'Envelopes',
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Transactions',
          tabBarLabel: 'Transactions',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileContent: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  settingsSection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e1e5e9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionsSection: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  modalPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  modalPasswordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalPasswordToggle: {
    padding: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default MainTabs;