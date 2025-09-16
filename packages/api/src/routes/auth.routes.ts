import { AuthService } from '../services';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';

export interface AuthRouteHandlers {
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; message: string; user?: any }>;
  signIn: (email: string, password: string, deviceInfo?: any) => Promise<{ success: boolean; user?: any }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<{ success: boolean }>;
  getCurrentUser: () => Promise<{ user: any | null }>;
  updateUserProfile: (updates: any) => Promise<{ user: any }>;
}

export function createAuthRoutes(client: SupabaseClient<Database>): AuthRouteHandlers {
  const authService = new AuthService(client);

  return {
    signUp: async (email: string, password: string, displayName?: string) => {
      const user = await authService.signUp({ email, password, displayName });
      return {
        success: true,
        message: 'Account created! Please check your email to verify.',
        user
      };
    },

    signIn: async (email: string, password: string, deviceInfo?: any) => {
      const user = await authService.signInWithPassword({
        email,
        password,
        ...deviceInfo
      });
      return {
        success: true,
        user
      };
    },

    resetPassword: async (email: string) => {
      await authService.resetPassword(email);
      return {
        success: true,
        message: 'Password reset email sent'
      };
    },

    logout: async () => {
      await authService.signOut();
      return {
        success: true
      };
    },

    getCurrentUser: async () => {
      const user = await authService.getCurrentUser();
      return {
        user
      };
    },

    updateUserProfile: async (updates: any) => {
      const user = await authService.updateUserProfile(updates);
      return {
        user
      };
    }
  };
}