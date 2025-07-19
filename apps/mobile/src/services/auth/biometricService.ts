/**
 * Biometric Authentication Service
 * 
 * Handles TouchID/FaceID authentication using react-native-biometrics
 */

import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometryType: keyof typeof BiometryTypes | null;
  hasCredentials: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string | undefined;
}

class BiometricService {
  private rnBiometrics: ReactNativeBiometrics;

  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: false, // Require actual biometric auth, not passcode fallback
    });
  }

  /**
   * Check if biometric authentication is available
   */
  async getCapabilities(): Promise<BiometricCapabilities> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      
      return {
        isAvailable: available,
        biometryType: biometryType || null,
        hasCredentials: keysExist,
      };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return {
        isAvailable: false,
        biometryType: null,
        hasCredentials: false,
      };
    }
  }

  /**
   * Create biometric keys for authentication
   */
  async createKeys(): Promise<boolean> {
    try {
      const { publicKey } = await this.rnBiometrics.createKeys();
      console.log('Biometric keys created successfully:', publicKey);
      return true;
    } catch (error) {
      console.error('Error creating biometric keys:', error);
      return false;
    }
  }

  /**
   * Delete biometric keys
   */
  async deleteKeys(): Promise<boolean> {
    try {
      const { keysDeleted } = await this.rnBiometrics.deleteKeys();
      return keysDeleted;
    } catch (error) {
      console.error('Error deleting biometric keys:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticate(reason: string = 'Authenticate to access your account'): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.getCapabilities();
      
      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      if (!capabilities.hasCredentials) {
        // Create keys if they don't exist
        const keysCreated = await this.createKeys();
        if (!keysCreated) {
          return {
            success: false,
            error: 'Failed to set up biometric authentication',
          };
        }
      }

      const { success } = await this.rnBiometrics.createSignature({
        promptMessage: reason,
        payload: 'biometric_auth_' + Date.now(),
      });
      
      console.log('Biometric authentication result:', success);

      return {
        success,
        error: success ? undefined : 'Biometric authentication failed',
      } as BiometricAuthResult;
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('UserCancel')) {
        return {
          success: false,
          error: 'Authentication was cancelled',
        };
      }
      
      if (error.message?.includes('BiometryNotAvailable')) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }
      
      if (error.message?.includes('PasscodeNotSet')) {
        return {
          success: false,
          error: 'Please set up a passcode to use biometric authentication',
        };
      }

      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  }

  /**
   * Get user-friendly biometry type name
   */
  getBiometryTypeName(biometryType: keyof typeof BiometryTypes | null): string {
    switch (biometryType) {
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.Biometrics:
        return 'Fingerprint';
      default:
        return 'Biometric';
    }
  }
}

export const biometricService = new BiometricService();