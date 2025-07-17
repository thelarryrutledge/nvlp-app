/**
 * User Service
 * 
 * Service layer for user profile operations with error handling
 */

import { apiClient } from './client';
import { transformError, logError } from './errors';
import type { UserProfile } from '@nvlp/types';

class UserService {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const profile = await enhancedApiClient.getProfile();
      return profile;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'UserService.getProfile');
      throw apiError;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const profile = await enhancedApiClient.updateProfile(updates);
      return profile;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'UserService.updateProfile');
      throw apiError;
    }
  }
}

export const userService = new UserService();