import { BaseService } from './base.service';
import { User, UserUpdateRequest, ApiError, ErrorCode } from '@nvlp/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';
import { BudgetService } from './budget.service';

export interface SignInOptions {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
}

export interface SignUpOptions {
  email: string;
  password: string;
  displayName?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: string;
}

export class AuthService extends BaseService {
  constructor(client: SupabaseClient<Database>) {
    super(client);
  }

  async resetPassword(email: string): Promise<void> {
    const { data, error } = await this.client.functions.invoke('auth-password', {
      body: {
        action: 'reset_password',
        email,
      },
    });

    if (error) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Password reset request failed',
        error
      );
    }

    if (!data.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        data.error || 'Failed to send password reset email'
      );
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to update password',
        error
      );
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const { data, error } = await this.client.functions.invoke('auth-password', {
      body: {
        action: 'resend_verification',
        email,
      },
    });

    if (error) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Verification email request failed',
        error
      );
    }

    if (!data.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        data.error || 'Failed to resend verification email'
      );
    }
  }

  async signInWithPassword(options: SignInOptions): Promise<User> {
    // Call our Edge Function instead of Supabase client auth
    const { data, error } = await this.client.functions.invoke('auth-password', {
      body: {
        action: 'signin',
        email: options.email,
        password: options.password,
        deviceId: options.deviceId,
        deviceName: options.deviceName,
        deviceType: options.deviceType,
      },
    });

    if (error) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Authentication request failed',
        error
      );
    }

    if (!data.success) {
      // Check for specific error codes
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        throw new ApiError(
          ErrorCode.VALIDATION_ERROR,
          'Please verify your email before signing in'
        );
      }
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        data.error || 'Invalid email or password'
      );
    }

    if (!data.user) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Sign in succeeded but no user returned'
      );
    }

    // Store the session in the Supabase client for future requests
    if (data.session) {
      await this.client.auth.setSession(data.session);
    }

    return this.getUserProfile(data.user.id);
  }

  async signUp(options: SignUpOptions): Promise<{ user: User; requiresVerification: boolean }> {
    // Call our Edge Function instead of Supabase client auth
    const { data, error } = await this.client.functions.invoke('auth-password', {
      body: {
        action: 'signup',
        email: options.email,
        password: options.password,
        displayName: options.displayName,
      },
    });

    if (error) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Account creation request failed',
        error
      );
    }

    if (!data.success) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        data.error || 'Failed to create account'
      );
    }

    if (!data.userId) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Sign up succeeded but no user ID returned'
      );
    }

    // For signup, we can't get the full user profile immediately since email isn't verified
    // Return a minimal user object
    const minimalUser: Partial<User> = {
      id: data.userId,
      email: options.email,
      display_name: options.displayName || null,
      email_confirmed_at: null, // Not confirmed yet
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add required fields with defaults
      default_currency: 'USD',
      default_budget_id: null,
      avatar_url: null,
      user_id: data.userId,
    };
    
    return {
      user: minimalUser as User,
      requiresVerification: true,
    };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    
    if (error) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to sign out',
        error
      );
    }
  }

  async signOutAllOtherDevices(currentDeviceId?: string): Promise<void> {
    // Call the Edge Function to sign out all other devices
    const { data, error } = await this.client.functions.invoke('auth-password', {
      body: {
        action: 'signout_all',
        deviceId: currentDeviceId,
      },
    });

    if (error) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to sign out other devices',
        error
      );
    }
  }

  private async registerDevice(device: DeviceInfo): Promise<void> {
    const { error } = await this.client.functions.invoke('device-management/register', {
      body: {
        device_id: device.deviceId,
        device_name: device.deviceName,
        device_type: device.deviceType,
        device_fingerprint: device.deviceId, // Use deviceId as fingerprint for now
      },
    });

    if (error) {
      console.error('Failed to register device:', error);
      // Don't throw - device registration failure shouldn't block sign in
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await this.client.auth.getUser();

    if (error || !user) {
      return null;
    }

    return this.getUserProfile(user.id);
  }

  async refreshSession(): Promise<void> {
    const { error } = await this.client.auth.refreshSession();
    
    if (error) {
      throw new ApiError(
        ErrorCode.TOKEN_EXPIRED,
        'Failed to refresh session',
        error
      );
    }
  }

  private async getUserProfile(userId: string): Promise<User> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new ApiError(
        ErrorCode.NOT_FOUND,
        'User profile not found',
        error
      );
    }

    // If user has no default budget, create one
    if (!data.default_budget_id) {
      const budgetService = new BudgetService(this.client);
      
      // Create the initial budget
      const budget = await budgetService.createBudget({
        name: 'My Budget',
        description: 'Your personal budget',
        is_active: true
      });

      // Set it as the default
      await budgetService.setDefaultBudget(budget.id);
      
      // Re-fetch the updated profile
      const { data: updatedProfile } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (updatedProfile) {
        return updatedProfile as User;
      }
    }

    return data as User;
  }

  async updateUserProfile(updates: UserUpdateRequest): Promise<User> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('user_profiles')
      .update({
        display_name: updates.display_name,
        avatar_url: updates.avatar_url,
        default_currency: updates.default_currency,
        default_budget_id: updates.default_budget_id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as User;
  }
}