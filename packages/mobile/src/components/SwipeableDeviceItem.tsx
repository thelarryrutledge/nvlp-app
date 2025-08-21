import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import {
  PanGestureHandler,
  State,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { Device } from '@nvlp/types';

interface SwipeableDeviceItemProps {
  device: Device;
  isCurrentDevice: boolean;
  onPress?: (device: Device) => void;
  onRename?: (device: Device) => void;
  onSignOut?: (device: Device) => void;
  onRevoke?: (device: Device) => void;
  showRevokeOption?: boolean;
}

const SWIPE_THRESHOLD = 120;
const ACTION_BUTTON_WIDTH = 80;

/**
 * Swipeable Device List Item
 * 
 * A device list item that supports swipe-to-reveal actions:
 * - Swipe right to reveal rename and sign out options
 * - Long press for additional context menu
 * - Tap to view device details
 */
export const SwipeableDeviceItem: React.FC<SwipeableDeviceItemProps> = ({
  device,
  isCurrentDevice,
  onPress,
  onRename,
  onSignOut,
  onRevoke,
  showRevokeOption = false,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureRef = useRef<PanGestureHandler>(null);

  const formatLastSeen = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDeviceIcon = (): string => {
    if (device.device_type === 'ios') {
      return device.device_model?.includes('iPad') ? '📱' : '📱';
    }
    return '🤖';
  };

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const openActions = () => {
    const targetX = isCurrentDevice ? -ACTION_BUTTON_WIDTH : -(ACTION_BUTTON_WIDTH * 2);
    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    
    // Only allow swiping left (negative values)
    if (translationX <= 0) {
      translateX.setValue(translationX);
    }
  };

  const handleStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    const { state, translationX, velocityX } = event.nativeEvent;

    if (state === State.END) {
      const shouldOpen = Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 500;
      
      if (shouldOpen && translationX < 0) {
        openActions();
      } else {
        resetPosition();
      }
    }
  };

  const handlePress = () => {
    resetPosition();
    onPress?.(device);
  };

  const handleRename = () => {
    resetPosition();
    onRename?.(device);
  };

  const handleSignOut = () => {
    resetPosition();
    
    Alert.alert(
      'Sign Out Device',
      `Are you sure you want to sign out "${device.device_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => onSignOut?.(device),
        },
      ]
    );
  };

  const handleRevoke = () => {
    resetPosition();
    
    Alert.alert(
      'Revoke Device',
      `Are you sure you want to permanently revoke "${device.device_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => onRevoke?.(device),
        },
      ]
    );
  };

  const renderActions = () => {
    if (isCurrentDevice) {
      // Current device only shows rename option
      return (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.renameButton]}
            onPress={handleRename}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
            <Text style={styles.actionButtonLabel}>Rename</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Other devices show sign out and optionally revoke
    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.renameButton]}
          onPress={handleRename}
        >
          <Text style={styles.actionButtonText}>✏️</Text>
          <Text style={styles.actionButtonLabel}>Rename</Text>
        </TouchableOpacity>
        
        {showRevokeOption ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.revokeButton]}
            onPress={handleRevoke}
          >
            <Text style={styles.actionButtonText}>🚫</Text>
            <Text style={styles.actionButtonLabel}>Revoke</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.actionButtonText}>👋</Text>
            <Text style={styles.actionButtonLabel}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background actions */}
      <View style={styles.backgroundActions}>
        {renderActions()}
      </View>
      
      {/* Main swipeable content */}
      <PanGestureHandler
        ref={gestureRef}
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-5, 5]}
      >
        <Animated.View
          style={[
            styles.itemContainer,
            isCurrentDevice && styles.currentDeviceContainer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.content}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <View style={styles.deviceIconContainer}>
              <Text style={styles.deviceIcon}>{getDeviceIcon()}</Text>
            </View>
            
            <View style={styles.deviceInfo}>
              <View style={styles.deviceNameRow}>
                <Text style={styles.deviceName}>{device.device_name}</Text>
                {isCurrentDevice && (
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
            
            <View style={styles.swipeIndicator}>
              <Text style={styles.swipeIndicatorText}>⇐</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
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
  backgroundActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
  },
  actionsContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  actionButton: {
    width: ACTION_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  renameButton: {
    backgroundColor: '#007AFF',
  },
  signOutButton: {
    backgroundColor: '#FF6B6B',
  },
  revokeButton: {
    backgroundColor: '#DC3545',
  },
  actionButtonText: {
    fontSize: 18,
    marginBottom: 4,
  },
  actionButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  currentDeviceContainer: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
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
  swipeIndicator: {
    marginLeft: 8,
    opacity: 0.3,
  },
  swipeIndicatorText: {
    fontSize: 16,
    color: '#959da5',
  },
});

export default SwipeableDeviceItem;