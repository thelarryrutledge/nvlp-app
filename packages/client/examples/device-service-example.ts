/**
 * Device Service Example
 * 
 * Shows how to use the DeviceService for device registration and management
 */

import { createNVLPClient } from '../src';

async function deviceServiceExample() {
  // Create client instance
  const client = createNVLPClient({
    supabaseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    customDomain: 'https://api.nvlp.app', // Optional custom domain
  });

  try {
    // Example device registration
    const deviceInfo = {
      device_id: 'device-123-' + Date.now(),
      device_fingerprint: 'ios-iphone15-3-' + Math.random(),
      device_name: 'My iPhone 15 Pro',
      device_type: 'ios' as const,
      device_model: 'iPhone15,3',
      os_version: '17.2.1',
      app_version: '1.0.0',
      push_token: 'sample-push-token'
    };

    console.log('Registering device...');
    const registrationResult = await client.device.registerDevice(deviceInfo);
    console.log('Device registered:', {
      isNewDevice: registrationResult.is_new_device,
      deviceName: registrationResult.device.device_name,
      requiresNotification: registrationResult.requires_notification
    });

    // List all devices
    console.log('Getting all devices...');
    const devices = await client.device.getDevices();
    console.log(`Found ${devices.length} devices`);
    devices.forEach(device => {
      console.log(`- ${device.device_name} (${device.device_type}) - Current: ${device.is_current}`);
    });

    // Get current device
    console.log('Getting current device...');
    const currentDevice = await client.device.getCurrentDevice();
    console.log('Current device:', currentDevice.device_name);

    // Update device name
    console.log('Updating device name...');
    const updatedDevice = await client.device.updateDeviceInfo({
      device_name: 'My Updated iPhone 15 Pro',
      app_version: '1.0.1'
    });
    console.log('Device updated:', updatedDevice.device_name);

    // Get security status
    console.log('Getting security status...');
    const securityStatus = await client.device.getDeviceSecurityStatus();
    console.log('Security status:', {
      totalDevices: securityStatus.total_devices,
      activeDevices: securityStatus.active_devices,
      currentDevice: securityStatus.current_device.device_name,
      recentSignins: securityStatus.recent_signins.length
    });

    // Check session status
    console.log('Checking session status...');
    const isInvalidated = await client.device.isSessionInvalidated();
    console.log('Session invalidated:', isInvalidated);

  } catch (error) {
    console.error('Device service error:', error);
  }
}

// Example usage
if (require.main === module) {
  deviceServiceExample().catch(console.error);
}

export { deviceServiceExample };