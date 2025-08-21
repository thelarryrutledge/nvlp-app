/**
 * In-App Notification Service
 * 
 * Manages in-app notifications for device alerts and other important events.
 * Uses a queue system to display notifications one at a time.
 */

import reactotron from '../config/reactotron';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actions?: NotificationAction[];
  autoHide?: boolean;
  duration?: number; // ms
  onPress?: () => void;
  metadata?: any;
}

export interface NotificationAction {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface DeviceNotification extends Omit<InAppNotification, 'type'> {
  type: 'warning';
  deviceName: string;
  deviceId: string;
  location?: string;
  timestamp: Date;
}

class NotificationService {
  private static instance: NotificationService;
  private notificationQueue: InAppNotification[] = [];
  private currentNotification: InAppNotification | null = null;
  private listeners: Set<(notification: InAppNotification | null) => void> = new Set();
  private dismissTimer: NodeJS.Timeout | null = null;

  private constructor() {
    reactotron.log('📢 NotificationService initialized');
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Show a notification
   */
  show(notification: Omit<InAppNotification, 'id'>): void {
    const notificationWithId: InAppNotification = {
      ...notification,
      id: this.generateId(),
    };

    reactotron.log('📢 Showing notification:', {
      id: notificationWithId.id,
      title: notificationWithId.title,
      type: notificationWithId.type,
    });

    // Add to queue
    this.notificationQueue.push(notificationWithId);
    
    // Process queue if not already showing a notification
    if (!this.currentNotification) {
      this.processQueue();
    }
  }

  /**
   * Show a new device alert notification
   */
  showDeviceAlert(deviceInfo: {
    deviceName: string;
    deviceId: string;
    location?: string;
    onViewDetails?: () => void;
    onSignOutDevice?: () => void;
  }): void {
    const notification: Omit<InAppNotification, 'id'> = {
      type: 'warning',
      title: 'New Device Signed In',
      message: `A new device "${deviceInfo.deviceName}" just signed in to your account${
        deviceInfo.location ? ` from ${deviceInfo.location}` : ''
      }. If this wasn't you, sign out the device immediately.`,
      actions: [
        {
          text: 'View Details',
          onPress: deviceInfo.onViewDetails || (() => {}),
          style: 'default',
        },
        {
          text: 'Sign Out Device',
          onPress: deviceInfo.onSignOutDevice || (() => {}),
          style: 'destructive',
        },
        {
          text: 'It was me',
          onPress: () => this.dismiss(),
          style: 'cancel',
        },
      ],
      autoHide: false, // Don't auto-hide security alerts
      metadata: {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        location: deviceInfo.location,
        timestamp: new Date(),
      },
    };

    this.show(notification);
  }

  /**
   * Show an info notification
   */
  showInfo(title: string, message: string, options?: Partial<InAppNotification>): void {
    this.show({
      type: 'info',
      title,
      message,
      autoHide: true,
      duration: 3000,
      ...options,
    });
  }

  /**
   * Show a success notification
   */
  showSuccess(title: string, message: string, options?: Partial<InAppNotification>): void {
    this.show({
      type: 'success',
      title,
      message,
      autoHide: true,
      duration: 3000,
      ...options,
    });
  }

  /**
   * Show an error notification
   */
  showError(title: string, message: string, options?: Partial<InAppNotification>): void {
    this.show({
      type: 'error',
      title,
      message,
      autoHide: true,
      duration: 5000,
      ...options,
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(title: string, message: string, options?: Partial<InAppNotification>): void {
    this.show({
      type: 'warning',
      title,
      message,
      autoHide: true,
      duration: 4000,
      ...options,
    });
  }

  /**
   * Dismiss the current notification
   */
  dismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    this.currentNotification = null;
    this.notifyListeners(null);
    
    // Process next in queue
    this.processQueue();
  }

  /**
   * Dismiss a specific notification by ID
   */
  dismissById(id: string): void {
    if (this.currentNotification?.id === id) {
      this.dismiss();
    } else {
      // Remove from queue if present
      this.notificationQueue = this.notificationQueue.filter(n => n.id !== id);
    }
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }

    this.notificationQueue = [];
    this.currentNotification = null;
    this.notifyListeners(null);
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notification: InAppNotification | null) => void): () => void {
    this.listeners.add(listener);
    
    // Send current notification immediately
    listener(this.currentNotification);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get the current notification
   */
  getCurrentNotification(): InAppNotification | null {
    return this.currentNotification;
  }

  /**
   * Get the queue size
   */
  getQueueSize(): number {
    return this.notificationQueue.length;
  }

  // Private methods

  private processQueue(): void {
    if (this.notificationQueue.length === 0) {
      return;
    }

    // Get next notification
    const notification = this.notificationQueue.shift();
    if (!notification) {
      return;
    }

    // Set as current
    this.currentNotification = notification;
    this.notifyListeners(notification);

    // Set up auto-hide if needed
    if (notification.autoHide) {
      const duration = notification.duration || 3000;
      this.dismissTimer = setTimeout(() => {
        this.dismiss();
      }, duration);
    }
  }

  private notifyListeners(notification: InAppNotification | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Export singleton instance
export default NotificationService.getInstance();