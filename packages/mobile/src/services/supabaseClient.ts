import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import reactotron from '../config/reactotron';

/**
 * Supabase client for magic link authentication
 * 
 * This is a simple client focused on authentication only.
 * For full API operations, use the @nvlp/client package.
 */
class SupabaseAuthClient {
  private client;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    reactotron.log('🔧 Supabase auth client initialized');
  }

  /**
   * Send magic link to user's email
   */
  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      reactotron.log('📧 Sending magic link to:', email);

      const redirectUrl = `${env.DEEP_LINK_SCHEME}://auth/callback`;
      
      const { error } = await this.client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        reactotron.error('Magic link error:', error);
        return { success: false, error: error.message };
      }

      reactotron.log('✅ Magic link sent successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reactotron.error('Magic link request failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Exchange session tokens (called after magic link redirect)
   */
  async exchangeCodeForSession(accessToken: string, refreshToken: string) {
    try {
      const { data, error } = await this.client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        reactotron.error('Session exchange error:', error);
        return { success: false, error: error.message };
      }

      reactotron.log('✅ Session established:', data.user?.email);
      return { success: true, user: data.user, session: data.session };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reactotron.error('Session exchange failed:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const { data, error } = await this.client.auth.getSession();
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, session: data.session };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      
      if (error) {
        reactotron.error('Sign out error:', error);
        return { success: false, error: error.message };
      }

      reactotron.log('✅ User signed out');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reactotron.error('Sign out failed:', error);
      return { success: false, error: errorMessage };
    }
  }
}

// Export singleton instance
export default new SupabaseAuthClient();