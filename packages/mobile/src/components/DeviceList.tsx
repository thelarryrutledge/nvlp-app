import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Device } from '@nvlp/types';
import SwipeableDeviceItem from './SwipeableDeviceItem';

interface DeviceListProps {
  devices: Device[];
  currentDeviceId?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onDevicePress?: (device: Device) => void;
  onDeviceRename?: (device: Device) => void;
  onDeviceSignOut?: (device: Device) => void;
  onDeviceRevoke?: (device: Device) => void;
  onSignOutCurrentDevice?: () => void;
  showRevokeOption?: boolean;
  emptyStateText?: string;
  headerComponent?: React.ReactElement | null;
  footerComponent?: React.ReactElement | null;
}

/**
 * Device List Component
 * 
 * Displays a list of devices with swipe-to-delete functionality.
 * Each device item can be swiped to reveal action buttons.
 */
export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  currentDeviceId,
  isLoading = false,
  onRefresh,
  onDevicePress,
  onDeviceRename,
  onDeviceSignOut,
  onDeviceRevoke,
  onSignOutCurrentDevice,
  showRevokeOption = false,
  emptyStateText = 'No devices found',
  headerComponent,
  footerComponent,
}) => {
  const isCurrentDevice = (device: Device): boolean => {
    return device.is_current || device.device_id === currentDeviceId;
  };

  const renderDevice = ({ item: device }: { item: Device }) => (
    <SwipeableDeviceItem
        device={device}
        isCurrentDevice={isCurrentDevice(device)}
        onPress={onDevicePress}
        onRename={onDeviceRename}
        onSignOut={onDeviceSignOut}
        onRevoke={onDeviceRevoke}
        onSignOutCurrentDevice={onSignOutCurrentDevice}
        showRevokeOption={showRevokeOption}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📱</Text>
      <Text style={styles.emptyStateText}>{emptyStateText}</Text>
      <Text style={styles.emptyStateSubtext}>
        Your active sessions will appear here
      </Text>
    </View>
  );

  const renderHeader = () => {
    const defaultHeader = devices.length > 0 ? (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Devices</Text>
        <Text style={styles.headerSubtitle}>
          {devices.filter(d => !d.is_revoked).length} active session{devices.filter(d => !d.is_revoked).length !== 1 ? 's' : ''}
          {devices.find(isCurrentDevice) && ` • Current: ${devices.find(isCurrentDevice)?.device_name}`}
        </Text>
        <Text style={styles.headerHint}>
          ← Swipe left on any device to see actions
        </Text>
      </View>
    ) : null;

    if (headerComponent) {
      return (
        <>
          {headerComponent}
          {defaultHeader}
        </>
      );
    }
    
    return defaultHeader;
  };

  const renderFooter = () => {
    const defaultFooter = devices.length > 0 ? (
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Regularly review your active sessions for security
        </Text>
      </View>
    ) : null;

    if (footerComponent) {
      return (
        <>
          {defaultFooter}
          {footerComponent}
        </>
      );
    }
    
    return defaultFooter;
  };

  if (isLoading && devices.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.device_id}
        renderItem={renderDevice}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              colors={['#4CAF50']}
              tintColor="#4CAF50"
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.listContent,
          devices.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        // Optimize for performance
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={10}
        // Add some padding for better swipe experience
        contentInset={{ top: 0, bottom: 20 }}
        contentInsetAdjustmentBehavior="automatic"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#586069',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#24292e',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#586069',
    marginBottom: 8,
  },
  headerHint: {
    fontSize: 12,
    color: '#959da5',
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#586069',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#24292e',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#586069',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DeviceList;