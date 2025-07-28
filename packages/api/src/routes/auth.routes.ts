import { AuthService } from '../services';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';

export interface AuthRouteHandlers {
  sendMagicLink: (email: string, redirectTo?: string) => Promise<{ success: boolean; message: string }>;
  handleCallback: (code: string) => Promise<{ success: boolean; user?: any }>;
  logout: () => Promise<{ success: boolean }>;
  getCurrentUser: () => Promise<{ user: any | null }>;
  updateUserProfile: (updates: any) => Promise<{ user: any }>;
}

export function createAuthRoutes(client: SupabaseClient<Database>): AuthRouteHandlers {
  const authService = new AuthService(client);

  return {
    sendMagicLink: async (email: string, redirectTo?: string) => {
      await authService.signInWithMagicLink({ email, redirectTo });
      return {
        success: true,
        message: 'Magic link sent to your email'
      };
    },

    handleCallback: async (code: string) => {
      // The callback is handled automatically by Supabase client
      // This endpoint would be used in a server environment to exchange the code
      return {
        success: true,
        message: 'Authentication successful'
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