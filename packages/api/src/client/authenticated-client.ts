import { SupabaseClient, Session } from '@supabase/supabase-js';
import { Database, ApiError, ErrorCode } from '@nvlp/types';

export interface SessionChangeHandler {
  (session: Session | null): void;
}

export class AuthenticatedClient {
  private client: SupabaseClient<Database>;
  private sessionChangeHandlers: SessionChangeHandler[] = [];

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
    this.setupAuthStateListener();
  }

  private setupAuthStateListener(): void {
    this.client.auth.onAuthStateChange((event, session) => {
      // Notify all registered handlers of session changes
      this.sessionChangeHandlers.forEach(handler => handler(session));
      
      // Handle specific auth events
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          // Session is valid, nothing special to do
          break;
        case 'SIGNED_OUT':
          // Clear any cached data if needed
          break;
        case 'USER_UPDATED':
          // User data was updated
          break;
      }
    });
  }

  onSessionChange(handler: SessionChangeHandler): () => void {
    this.sessionChangeHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      const index = this.sessionChangeHandlers.indexOf(handler);
      if (index > -1) {
        this.sessionChangeHandlers.splice(index, 1);
      }
    };
  }

  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await this.client.auth.getSession();
    
    if (error) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        'Failed to get session',
        error
      );
    }

    return session;
  }

  async ensureValidSession(): Promise<Session> {
    let { data: { session }, error } = await this.client.auth.getSession();
    
    if (error || !session) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        'No active session',
        error
      );
    }

    // Check if token is about to expire (within 60 seconds)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresIn = expiresAt * 1000 - Date.now();
      if (expiresIn < 60000) {
        // Proactively refresh the token
        const refreshResult = await this.client.auth.refreshSession();
        if (refreshResult.error || !refreshResult.data.session) {
          throw new ApiError(
            ErrorCode.UNAUTHORIZED,
            'Failed to refresh expiring session',
            refreshResult.error
          );
        }
        session = refreshResult.data.session;
      }
    }

    return session;
  }

  getSupabaseClient(): SupabaseClient<Database> {
    return this.client;
  }
}