/**
 * Secure Credential Storage Service
 * 
 * Stores encrypted user credentials for biometric authentication
 * Uses react-native-keychain for secure storage
 */

import * as Keychain from 'react-native-keychain';

export interface SecureCredentials {
  email: string;
  password: string;
}

class SecureCredentialStorage {
  private readonly SERVICE_NAME = 'com.nvlp.mobile.biometric';

  /**
   * Store user credentials securely
   */
  async storeCredentials(credentials: SecureCredentials): Promise<boolean> {
    try {
      console.log('Attempting to store credentials with Keychain...');
      const result = await Keychain.setInternetCredentials(
        this.SERVICE_NAME,
        credentials.email,
        credentials.password
      );
      
      console.log('Credentials stored successfully:', result);
      return !!result;
    } catch (error) {
      console.error('Error storing credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve stored credentials
   */
  async getCredentials(): Promise<SecureCredentials | null> {
    try {
      console.log('Attempting to retrieve credentials from Keychain...');
      const credentials = await Keychain.getInternetCredentials(this.SERVICE_NAME);
      
      if (credentials && credentials !== false && typeof credentials === 'object' && 'username' in credentials) {
        console.log('Credentials retrieved successfully');
        return {
          email: credentials.username,
          password: credentials.password,
        };
      }
      
      console.log('No credentials found');
      return null;
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      return null;
    }
  }

  /**
   * Check if credentials exist
   */
  async hasCredentials(): Promise<boolean> {
    try {
      console.log('Checking if credentials exist...');
      const credentials = await Keychain.getInternetCredentials(this.SERVICE_NAME);
      const exists = credentials && credentials !== false && typeof credentials === 'object' && 'username' in credentials;
      console.log('Credentials exist:', exists);
      return !!exists;
    } catch (error) {
      console.error('Error checking credentials:', error);
      return false;
    }
  }

  /**
   * Remove stored credentials
   */
  async removeCredentials(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials(this.SERVICE_NAME);
      console.log('Credentials removed: true');
      return true;
    } catch (error) {
      console.error('Error removing credentials:', error);
      return false;
    }
  }

  /**
   * Check if keychain is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return !!biometryType;
    } catch (error) {
      console.error('Error checking keychain availability:', error);
      return false;
    }
  }
}

export const secureCredentialStorage = new SecureCredentialStorage();