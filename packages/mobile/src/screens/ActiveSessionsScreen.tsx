import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDeviceManagement } from '../hooks/useDeviceManagement';
import { Device } from '@nvlp/types';
import reactotron from '../config/reactotron';

/**
 * Active Sessions Screen
 * 
 * Security settings screen that displays all active sessions/devices
 * and allows users to manage them.
 */
const ActiveSessionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  const {
    devices,
    currentDevice,
    securityStatus,
    isLoading,
    error,
    fetchDevices,
    signOutDevice,
    signOutAllOtherDevices,
    updateDeviceName,
    isCurrentDevice,
    hasMultipleDevices,
    refreshSecurityStatus,
    clearError,
  } = useDeviceManagement({
    autoFetch: true,
    showAlerts: false, // We'll handle alerts ourselves for better UX
  });

  // Fetch security status on mount
  useEffect(() => {
    refreshSecurityStatus();
  }, [refreshSecurityStatus]);

  // Log screen view
  useEffect(() => {
    reactotron.log('📱 Active Sessions screen viewed', {
      deviceCount: devices.length,
      currentDevice: currentDevice?.device_name,
    });
  }, [devices.length, currentDevice]);

  const handleSignOutDevice = (device: Device) => {
    Alert.alert(
      'Sign Out Device',
      `Are you sure you want to sign out "${device.device_name}"? This will end the session on that device.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutDevice(device.device_id);
              Alert.alert('Success', `"${device.device_name}" has been signed out.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out device. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSignOutAll = () => {
    Alert.alert(
      'Sign Out All Other Devices',
      'This will sign out all devices except the one you\'re currently using. You\'ll need to sign in again on those devices.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutAllOtherDevices();
              Alert.alert('Success', 'All other devices have been signed out.');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out devices. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleRenameDevice = (device: Device) => {
    Alert.prompt(
      'Rename Device',
      `Enter a new name for "${device.device_name}":`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: async (newName) => {
            if (newName && newName.trim() && newName !== device.device_name) {
              try {
                await updateDeviceName(device.device_id, newName.trim());
                Alert.alert('Success', 'Device name updated.');
              } catch (error) {
                Alert.alert('Error', 'Failed to update device name.');
              }
            }
          },
        },
      ],
      'plain-text',
      device.device_name
    );
  };

  const formatLastSeen = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getDeviceIcon = (device: Device): string => {
    if (device.device_type === 'ios') {
      return device.device_model?.includes('iPad') ? '📱' : '📱';
    }
    return '🤖';
  };

  const renderDevice = (device: Device) => {
    const isCurrent = isCurrentDevice(device.device_id);
    
    return (
      <TouchableOpacity
        key={device.device_id}
        style={[styles.deviceCard, isCurrent && styles.currentDeviceCard]}
        onPress={() => setSelectedDevice(device)}
        activeOpacity={0.7}
      >
        <View style={styles.deviceHeader}>
          <View style={styles.deviceIconContainer}>
            <Text style={styles.deviceIcon}>{getDeviceIcon(device)}</Text>
          </View>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceNameRow}>
              <Text style={styles.deviceName}>{device.device_name}</Text>
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>This Device</Text>
                </View>
              )}
            </View>
            <Text style={styles.deviceModel}>
              {device.device_model || device.device_type} • {device.os_version || 'Unknown OS'}
            </Text>
            <Text style={styles.lastSeen}>
              Last active: {formatLastSeen(device.last_seen)}
            </Text>
            {device.location_city && (
              <Text style={styles.location}>
                📍 {device.location_city}, {device.location_country}
              </Text>
            )}
          </View>
        </View>
        
        {!isCurrent && (
          <View style={styles.deviceActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRenameDevice(device)}
            >
              <Text style={styles.actionButtonText}>✏️ Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.signOutButton]}
              onPress={() => handleSignOutDevice(device)}
            >
              <Text style={[styles.actionButtonText, styles.signOutButtonText]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSecuritySummary = () => {
    if (!securityStatus) return null;

    return (
      <View style={styles.securitySummary}>
        <Text style={styles.sectionTitle}>Security Overview</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Active Sessions:</Text>
          <Text style={styles.summaryValue}>{securityStatus.active_devices}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Devices:</Text>
          <Text style={styles.summaryValue}>{securityStatus.total_devices}</Text>
        </View>
        {securityStatus.recent_signins.length > 0 && (
          <>
            <Text style={[styles.summaryLabel, styles.recentSigninsTitle]}>
              Recent Sign-ins:
            </Text>
            {securityStatus.recent_signins.map((signin, index) => (
              <View key={index} style={styles.recentSignin}>
                <Text style={styles.recentSigninDevice}>{signin.device_name}</Text>
                {signin.location && (
                  <Text style={styles.recentSigninLocation}>{signin.location}</Text>
                )}
                <Text style={styles.recentSigninTime}>
                  {formatLastSeen(signin.signin_time)}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  if (isLoading && devices.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              fetchDevices();
              refreshSecurityStatus();
            }}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Active Sessions</Text>
          <Text style={styles.subtitle}>
            Manage devices that have access to your account
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {renderSecuritySummary()}

        <View style={styles.devicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Devices</Text>
            {hasMultipleDevices() && (
              <TouchableOpacity
                style={styles.signOutAllButton}
                onPress={handleSignOutAll}
              >
                <Text style={styles.signOutAllText}>Sign Out All Others</Text>
              </TouchableOpacity>
            )}
          </View>

          {devices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No active sessions</Text>
            </View>
          ) : (
            devices.map(renderDevice)
          )}
        </View>

        <View style={styles.securityTips}>
          <Text style={styles.tipsTitle}>Security Tips</Text>
          <Text style={styles.tipText}>
            • Review your active sessions regularly
          </Text>
          <Text style={styles.tipText}>
            • Sign out devices you don't recognize
          </Text>
          <Text style={styles.tipText}>
            • Use unique device names for easy identification
          </Text>
          <Text style={styles.tipText}>
            • Enable notifications for new device sign-ins
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#24292e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#586069',
  },
  errorContainer: {
    backgroundColor: '#ffeef0',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#d73a49',
    flex: 1,
    fontSize: 14,
  },
  errorDismiss: {
    color: '#d73a49',
    fontSize: 20,
    fontWeight: 'bold',
    paddingLeft: 10,
  },
  securitySummary: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#586069',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#24292e',
  },
  recentSigninsTitle: {
    marginTop: 15,
    marginBottom: 10,
    fontWeight: '600',
  },
  recentSignin: {
    paddingLeft: 10,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#e1e4e8',
  },
  recentSigninDevice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#24292e',
  },
  recentSigninLocation: {
    fontSize: 13,
    color: '#586069',
  },
  recentSigninTime: {
    fontSize: 12,
    color: '#959da5',
  },
  devicesSection: {
    marginHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#24292e',
  },
  signOutAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffeef0',
    borderRadius: 6,
  },
  signOutAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d73a49',
  },
  deviceCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  currentDeviceCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  deviceHeader: {
    flexDirection: 'row',
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f6f8fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceIcon: {
    fontSize: 24,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#24292e',
    marginRight: 8,
  },
  currentBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },
  deviceModel: {
    fontSize: 14,
    color: '#586069',
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: 13,
    color: '#959da5',
    marginBottom: 2,
  },
  location: {
    fontSize: 13,
    color: '#586069',
  },
  deviceActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f6f8fa',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f6f8fa',
    marginRight: 8,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#ffeef0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#24292e',
  },
  signOutButtonText: {
    color: '#d73a49',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#959da5',
  },
  securityTips: {
    backgroundColor: '#f6f8fa',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#24292e',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#586069',
    marginBottom: 6,
    lineHeight: 20,
  },
});

export default ActiveSessionsScreen;