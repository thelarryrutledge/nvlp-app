import { SupabaseClient, Session } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';

export interface SessionMonitorOptions {
  checkInterval?: number; // milliseconds between checks (default: 60000 = 1 minute)
  refreshThreshold?: number; // milliseconds before expiry to refresh (default: 300000 = 5 minutes)
  onRefreshError?: (error: Error) => void;
  onSessionRefreshed?: (session: Session) => void;
}

export class SessionMonitor {
  private client: SupabaseClient<Database>;
  private intervalId?: NodeJS.Timeout;
  private options: Required<SessionMonitorOptions>;
  
  constructor(
    client: SupabaseClient<Database>,
    options: SessionMonitorOptions = {}
  ) {
    this.client = client;
    this.options = {
      checkInterval: options.checkInterval ?? 60000,
      refreshThreshold: options.refreshThreshold ?? 300000,
      onRefreshError: options.onRefreshError ?? (() => {}),
      onSessionRefreshed: options.onSessionRefreshed ?? (() => {}),
    };
  }

  start(): void {
    if (this.intervalId) {
      return; // Already running
    }

    // Check immediately
    this.checkSession();

    // Then check periodically
    this.intervalId = setInterval(() => {
      this.checkSession();
    }, this.options.checkInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async checkSession(): Promise<void> {
    try {
      const { data: { session } } = await this.client.auth.getSession();
      
      if (!session || !session.expires_at) {
        return; // No session to monitor
      }

      const now = Date.now();
      const expirationTime = session.expires_at * 1000;
      const timeUntilExpiry = expirationTime - now;

      // If token expires within threshold, refresh it
      if (timeUntilExpiry > 0 && timeUntilExpiry <= this.options.refreshThreshold) {
        const { data, error } = await this.client.auth.refreshSession();
        
        if (error) {
          this.options.onRefreshError(new Error(`Failed to refresh session: ${error.message}`));
        } else if (data.session) {
          this.options.onSessionRefreshed(data.session);
        }
      }
    } catch (error) {
      // Don't let monitoring errors bubble up
      console.error('Session monitor error:', error);
    }
  }

  async forceRefresh(): Promise<Session | null> {
    try {
      const { data, error } = await this.client.auth.refreshSession();
      
      if (error) {
        throw new Error(`Failed to refresh session: ${error.message}`);
      }
      
      return data.session;
    } catch (error) {
      this.options.onRefreshError(error as Error);
      throw error;
    }
  }
}