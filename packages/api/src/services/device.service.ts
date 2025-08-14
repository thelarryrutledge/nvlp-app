import { BaseService } from './base.service';
import { NotificationService } from './notification.service';
import { 
  Device, 
  DeviceRegisterRequest, 
  DeviceUpdateRequest,
  DeviceRegistrationResult, 
  DeviceSecurityStatus,
  SessionInvalidationRequest,
  DeviceLocation,
  ApiError,
  ErrorCode
} from '@nvlp/types';

export class DeviceService extends BaseService {
  private notificationService: NotificationService;

  constructor(client: any) {
    super(client);
    this.notificationService = new NotificationService(client);
  }
  
  /**
   * Register a new device or update existing device info
   * Automatically sends notification email for new devices
   */
  async registerDevice(deviceInfo: DeviceRegisterRequest): Promise<DeviceRegistrationResult> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      
      // Call the database function to register/update device
      const { data, error } = await this.client.rpc('register_device', {
        p_device_id: deviceInfo.device_id,
        p_device_fingerprint: deviceInfo.device_fingerprint,
        p_device_name: deviceInfo.device_name,
        p_device_type: deviceInfo.device_type,
        p_device_model: deviceInfo.device_model || null,
        p_os_version: deviceInfo.os_version || null,
        p_app_version: deviceInfo.app_version || null,
        p_ip_address: deviceInfo.ip_address || null,
        p_location_country: deviceInfo.location_country || null,
        p_location_city: deviceInfo.location_city || null,
        p_push_token: deviceInfo.push_token || null
      });

      if (error) {
        this.handleError(error);
      }

      const result = data[0];
      const registrationResult: DeviceRegistrationResult = {
        is_new_device: result.is_new_device,
        device: result.device_record,
        requires_notification: result.is_new_device
      };

      // Send notification for new devices (fire-and-forget)
      if (result.is_new_device) {
        this.sendNewDeviceNotification(userId, result.device_record, {
          country: deviceInfo.location_country,
          city: deviceInfo.location_city,
          ip_address: deviceInfo.ip_address
        }).catch(error => {
          // Log error but don't fail the registration
          console.error('Failed to send new device notification:', error);
        });
      }

      return registrationResult;
    });
  }

  /**
   * Get all devices for the current user
   */
  async getDevices(): Promise<Device[]> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await this.client
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_revoked', false)
        .order('last_seen', { ascending: false });

      if (error) {
        this.handleError(error);
      }

      return data || [];
    });
  }

  /**
   * Get the current device (marked as is_current = true)
   */
  async getCurrentDevice(): Promise<Device> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await this.client
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_current', true)
        .eq('is_revoked', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ApiError(ErrorCode.NOT_FOUND, 'No current device found');
        }
        this.handleError(error);
      }

      return data;
    });
  }

  /**
   * Update device information
   */
  async updateDeviceInfo(deviceId: string, updates: DeviceUpdateRequest): Promise<Device> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await this.client
        .from('user_devices')
        .update({
          device_name: updates.device_name,
          push_token: updates.push_token,
          app_version: updates.app_version,
          location_country: updates.location_country,
          location_city: updates.location_city,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .eq('is_revoked', false)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ApiError(ErrorCode.NOT_FOUND, 'Device not found');
        }
        this.handleError(error);
      }

      return data;
    });
  }

  /**
   * Sign out a specific device
   */
  async signOutDevice(deviceId: string): Promise<void> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      const currentDevice = await this.getCurrentDevice();
      
      // Call database function to invalidate the session
      const { error } = await this.client.rpc('invalidate_sessions', {
        p_user_id: userId,
        p_device_id: deviceId,
        p_reason: 'user_signout',
        p_initiated_by_device: currentDevice.device_id
      });

      if (error) {
        this.handleError(error);
      }
    });
  }

  /**
   * Sign out all other devices (keep current device active)
   */
  async signOutAllOtherDevices(): Promise<void> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      const currentDevice = await this.getCurrentDevice();
      
      // Get all other devices
      const { data: otherDevices, error: fetchError } = await this.client
        .from('user_devices')
        .select('device_id')
        .eq('user_id', userId)
        .eq('is_revoked', false)
        .neq('device_id', currentDevice.device_id);

      if (fetchError) {
        this.handleError(fetchError);
      }

      // Invalidate each other device
      if (otherDevices && otherDevices.length > 0) {
        for (const device of otherDevices) {
          const { error } = await this.client.rpc('invalidate_sessions', {
            p_user_id: userId,
            p_device_id: device.device_id,
            p_reason: 'signout_all_others',
            p_initiated_by_device: currentDevice.device_id
          });

          if (error) {
            console.error('Failed to invalidate device:', device.device_id, error);
            // Continue with other devices even if one fails
          }
        }
      }
    });
  }

  /**
   * Revoke a device permanently
   */
  async revokeDevice(deviceId: string): Promise<void> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      const currentDevice = await this.getCurrentDevice();
      
      // First invalidate the session
      await this.signOutDevice(deviceId);
      
      // Then mark the device as revoked
      const { error } = await this.client
        .from('user_devices')
        .update({
          is_revoked: true,
          is_current: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (error) {
        this.handleError(error);
      }
    });
  }

  /**
   * Check if a session is invalidated
   */
  async isSessionInvalidated(deviceId?: string): Promise<boolean> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await this.client.rpc('is_session_invalidated', {
        p_user_id: userId,
        p_device_id: deviceId || null
      });

      if (error) {
        this.handleError(error);
      }

      return data === true;
    });
  }

  /**
   * Get device security status overview
   */
  async getDeviceSecurityStatus(): Promise<DeviceSecurityStatus> {
    return this.withRetry(async () => {
      const userId = await this.getCurrentUserId();
      
      // Get all devices
      const { data: devices, error: devicesError } = await this.client
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_revoked', false);

      if (devicesError) {
        this.handleError(devicesError);
      }

      const allDevices = devices || [];
      const currentDevice = allDevices.find(d => d.is_current) || allDevices[0];
      const activeDevices = allDevices.filter(d => {
        // Consider device active if used within last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(d.last_seen) > thirtyDaysAgo;
      });

      // Get recent sign-ins (last 10)
      const recentSignins = allDevices
        .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
        .slice(0, 10)
        .map(device => ({
          device_name: device.device_name,
          location: device.location_country && device.location_city 
            ? `${device.location_city}, ${device.location_country}`
            : device.location_country || undefined,
          signin_time: device.last_seen
        }));

      return {
        total_devices: allDevices.length,
        active_devices: activeDevices.length,
        current_device: currentDevice,
        recent_signins: recentSignins
      };
    });
  }

  /**
   * Clean up old invalidated sessions (maintenance function)
   */
  async cleanupOldSessions(): Promise<void> {
    return this.withRetry(async () => {
      const { error } = await this.client.rpc('cleanup_old_invalidated_sessions');

      if (error) {
        this.handleError(error);
      }
    });
  }

  /**
   * Send new device notification (private helper)
   */
  private async sendNewDeviceNotification(
    userId: string, 
    device: Device, 
    location?: DeviceLocation
  ): Promise<void> {
    try {
      await this.notificationService.sendNewDeviceAlert(userId, device, location);
    } catch (error) {
      console.error('Error sending device notification:', error);
      // Don't re-throw - notification failure shouldn't break device registration
    }
  }
}