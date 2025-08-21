/**
 * Notification Banner Component
 * 
 * Displays in-app notifications with animations and actions.
 * Appears at the top of the screen with safe area handling.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import notificationService, { InAppNotification, NotificationType } from '../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NotificationBanner: React.FC = () => {
  const [notification, setNotification] = useState<InAppNotification | null>(null);
  const [slideAnim] = useState(new Animated.Value(-200));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Subscribe to notifications
    const unsubscribe = notificationService.subscribe((newNotification) => {
      setNotification(newNotification);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (notification) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [notification, slideAnim]);

  if (!notification) {
    return null;
  }

  const getTypeStyle = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return styles.successBanner;
      case 'error':
        return styles.errorBanner;
      case 'warning':
        return styles.warningBanner;
      case 'info':
      default:
        return styles.infoBanner;
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getTypeIconColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'info':
      default:
        return '#2196F3';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getTypeStyle(notification.type),
        {
          transform: [{ translateY: slideAnim }],
          paddingTop: insets.top + 12,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={notification.onPress}
        activeOpacity={notification.onPress ? 0.8 : 1}
      >
        <View style={styles.header}>
          <Icon
            name={getTypeIcon(notification.type)}
            size={24}
            color={getTypeIconColor(notification.type)}
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.message} numberOfLines={3}>
              {notification.message}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => notificationService.dismiss()}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {notification.actions && notification.actions.length > 0 && (
          <View style={styles.actions}>
            {notification.actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  action.style === 'destructive' && styles.destructiveButton,
                  action.style === 'cancel' && styles.cancelButton,
                ]}
                onPress={() => {
                  action.onPress();
                  // Don't auto-dismiss for cancel actions, let the handler decide
                  if (action.style !== 'cancel') {
                    notificationService.dismiss();
                  }
                }}
              >
                <Text
                  style={[
                    styles.actionText,
                    action.style === 'destructive' && styles.destructiveText,
                    action.style === 'cancel' && styles.cancelText,
                  ]}
                >
                  {action.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E0E0E0',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  destructiveButton: {
    backgroundColor: '#FFF3F3',
  },
  destructiveText: {
    color: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelText: {
    color: '#666',
  },
  infoBanner: {
    backgroundColor: 'white',
  },
  successBanner: {
    backgroundColor: 'white',
  },
  warningBanner: {
    backgroundColor: 'white',
  },
  errorBanner: {
    backgroundColor: 'white',
  },
});

export default NotificationBanner;