import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useDeviceManagement } from '../hooks/useDeviceManagement';

/**
 * Example component demonstrating the useDeviceManagement hook
 * 
 * This component shows how to:
 * - List all user devices
 * - Identify the current device
 * - Sign out other devices
 * - Update device names
 */
export const DeviceManagementExample: React.FC = () => {
  const {
    devices,
    currentDevice,
    isLoading,
    error,
    fetchDevices,
    signOutDevice,
    signOutAllOtherDevices,
    updateDeviceName,
    isCurrentDevice,
    hasMultipleDevices,
    clearError,
  } = useDeviceManagement({
    autoFetch: true,
    showAlerts: true,
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Device management error:', error);
    }
  }, [error]);

  const handleSignOutDevice = (deviceId: string) => {
    Alert.alert(
      'Sign Out Device',
      'Are you sure you want to sign out this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOutDevice(deviceId),
        },
      ]
    );
  };

  const handleSignOutAll = () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign out all other devices. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: () => signOutAllOtherDevices(),
        },
      ]
    );
  };

  const handleRenameDevice = (deviceId: string, currentName: string) => {
    Alert.prompt(
      'Rename Device',
      'Enter a new name for this device:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rename',
          onPress: (newName) => {
            if (newName && newName !== currentName) {
              updateDeviceName(deviceId, newName);
            }
          },
        },
      ],
      'plain-text',
      currentName
    );
  };

  const renderDevice = ({ item }: { item: any }) => {
    const isCurrent = isCurrentDevice(item.device_id);
    
    return (
      <View style={[styles.deviceCard, isCurrent && styles.currentDevice]}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>
            {item.device_name} {isCurrent && '(This Device)'}
          </Text>
          <Text style={styles.deviceDetails}>
            {item.device_type === 'ios' ? '📱' : '🤖'} {item.device_model}
          </Text>
          <Text style={styles.deviceDetails}>
            Last seen: {new Date(item.last_seen).toLocaleDateString()}
          </Text>
          {item.location_city && (
            <Text style={styles.deviceDetails}>
              📍 {item.location_city}, {item.location_country}
            </Text>
          )}
        </View>
        
        {!isCurrent && (
          <View style={styles.deviceActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRenameDevice(item.device_id, item.device_name)}
            >
              <Text style={styles.actionButtonText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={() => handleSignOutDevice(item.device_id)}
            >
              <Text style={[styles.actionButtonText, styles.dangerText]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && devices.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Management</Text>
        {currentDevice && (
          <Text style={styles.subtitle}>
            Signed in as: {currentDevice.device_name}
          </Text>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.device_id}
        renderItem={renderDevice}
        refreshing={isLoading}
        onRefresh={fetchDevices}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No devices found</Text>
        }
      />

      {hasMultipleDevices() && (
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleSignOutAll}
        >
          <Text style={styles.primaryButtonText}>
            Sign Out All Other Devices
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#c00',
    flex: 1,
  },
  errorDismiss: {
    color: '#c00',
    fontWeight: 'bold',
  },
  deviceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentDevice: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  deviceDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deviceActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dangerButton: {
    backgroundColor: '#fee',
  },
  dangerText: {
    color: '#c00',
  },
  primaryButton: {
    margin: 15,
    padding: 15,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
});

export default DeviceManagementExample;