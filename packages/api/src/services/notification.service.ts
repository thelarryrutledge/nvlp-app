import { BaseService } from './base.service';
import { 
  Device, 
  DeviceLocation,
  ApiError,
  ErrorCode
} from '@nvlp/types';

export interface NewDeviceNotificationData {
  user_name: string;
  user_email: string;
  device_name: string;
  signin_time: string;
  location: string;
  ip_address: string;
  app_url?: string;
}

export class NotificationService extends BaseService {

  /**
   * Send a new device sign-in notification email
   */
  async sendNewDeviceAlert(
    userId: string,
    deviceInfo: Device,
    location?: DeviceLocation
  ): Promise<void> {
    return this.withRetry(async () => {
      // Get user information for the email
      const { data: user, error: userError } = await this.client.auth.admin.getUserById(userId);
      
      if (userError || !user?.user || !user.user.email) {
        console.warn('Cannot send device notification - user or email not found:', userId);
        return; // Don't throw error, just skip notification
      }

      // Format location string
      const locationStr = location?.country && location?.city 
        ? `${location.city}, ${location.country}`
        : location?.country || 'Unknown location';

      // Prepare notification data
      const notificationData: NewDeviceNotificationData = {
        user_name: user.user.user_metadata?.display_name || 
                   user.user.user_metadata?.name || 
                   user.user.email?.split('@')[0] || 
                   'User',
        user_email: user.user.email,
        device_name: deviceInfo.device_name,
        signin_time: new Date(deviceInfo.first_seen).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }),
        location: locationStr,
        ip_address: deviceInfo.ip_address || 'Unknown',
        app_url: 'https://nvlp.app' // TODO: Make this configurable
      };

      // Call the Edge Function to send the email
      const { data, error } = await this.client.functions.invoke('send-device-notification', {
        body: notificationData
      });

      if (error) {
        console.error('Failed to send device notification:', error);
        // Don't throw error - notification failure shouldn't break device registration
        return;
      }

      console.log('Device notification sent successfully for user:', userId);
    });
  }

  /**
   * Send bulk notifications (for admin operations)
   */
  async sendBulkDeviceAlerts(
    notifications: Array<{
      userId: string;
      deviceInfo: Device;
      location?: DeviceLocation;
    }>
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    // Process notifications in batches to avoid overwhelming the email service
    const batchSize = 5;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (notification) => {
          try {
            await this.sendNewDeviceAlert(
              notification.userId, 
              notification.deviceInfo, 
              notification.location
            );
            sent++;
          } catch (error) {
            console.error('Failed to send notification for user:', notification.userId, error);
            failed++;
          }
        })
      );

      // Small delay between batches to be respectful to email service
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { sent, failed };
  }

  /**
   * Check if user has email notifications enabled
   * (Future: could check user preferences when we implement settings)
   */
  async shouldSendNotification(userId: string, notificationType: 'new_device'): Promise<boolean> {
    // For now, always send notifications
    // In the future, we could check user preferences in the database
    return true;
  }

  /**
   * Send a test notification (for development/testing)
   */
  async sendTestNotification(email: string): Promise<void> {
    return this.withRetry(async () => {
      const testData: NewDeviceNotificationData = {
        user_name: 'Test User',
        user_email: email,
        device_name: 'Test Device (iPhone 15 Pro)',
        signin_time: new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        }),
        location: 'San Francisco, CA',
        ip_address: '192.168.1.100',
        app_url: 'https://nvlp.app'
      };

      const { data, error } = await this.client.functions.invoke('send-device-notification', {
        body: testData
      });

      if (error) {
        throw new ApiError(
          ErrorCode.SERVICE_UNAVAILABLE,
          `Failed to send test notification: ${error.message}`,
          error
        );
      }

      console.log('Test notification sent successfully to:', email);
    });
  }

  /**
   * Get notification history/status (future feature)
   */
  async getNotificationHistory(userId: string): Promise<any[]> {
    // Future: implement notification history tracking
    return [];
  }
}