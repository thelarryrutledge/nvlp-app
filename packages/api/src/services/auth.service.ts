import { BaseService } from './base.service';
import { User, ApiError, ErrorCode } from '@nvlp/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';

export interface SignInOptions {
  email: string;
  password?: string;
  redirectTo?: string;
}

export interface SignUpOptions {
  email: string;
  password: string;
  displayName?: string;
}

export class AuthService extends BaseService {
  constructor(client: SupabaseClient<Database>) {
    super(client);
  }

  async signInWithMagicLink(options: SignInOptions): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email: options.email,
      options: {
        emailRedirectTo: options.redirectTo,
      },
    });

    if (error) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to send magic link',
        error
      );
    }
  }

  async signInWithPassword(email: string, password: string): Promise<User> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        'Invalid email or password',
        error
      );
    }

    if (!data.user) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Sign in succeeded but no user returned'
      );
    }

    return this.getUserProfile(data.user.id);
  }

  async signUp(options: SignUpOptions): Promise<User> {
    const { data, error } = await this.client.auth.signUp({
      email: options.email,
      password: options.password,
      options: {
        data: {
          display_name: options.displayName,
        },
      },
    });

    if (error) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Failed to create account',
        error
      );
    }

    if (!data.user) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        'Sign up succeeded but no user returned'
      );
    }

    return this.getUserProfile(data.user.id);
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
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new ApiError(
        ErrorCode.NOT_FOUND,
        'User profile not found',
        error
      );
    }

    return data as User;
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('user_profiles')
      .update({
        display_name: updates.display_name,
        avatar_url: updates.avatar_url,
        default_budget_id: updates.default_budget_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as User;
  }
}