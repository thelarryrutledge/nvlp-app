import { SupabaseClient, Session } from '@supabase/supabase-js';
import { Database, ApiError, ErrorCode } from '@nvlp/types';
import { TokenStorage, InMemoryTokenStorage } from './token-storage';

export interface SessionChangeHandler {
  (session: Session | null): void;
}

export interface AuthenticatedClientOptions {
  tokenStorage?: TokenStorage;
  storageKey?: string;
  persistSession?: boolean;
}

export class AuthenticatedClient {
  private client: SupabaseClient<Database>;
  private sessionChangeHandlers: SessionChangeHandler[] = [];
  private tokenStorage: TokenStorage;
  private storageKey: string;
  private persistSession: boolean;

  constructor(
    client: SupabaseClient<Database>, 
    options: AuthenticatedClientOptions = {}
  ) {
    this.client = client;
    this.tokenStorage = options.tokenStorage || new InMemoryTokenStorage();
    this.storageKey = options.storageKey || 'nvlp_session';
    this.persistSession = options.persistSession ?? true;
    
    this.setupAuthStateListener();
    this.restoreSession();
  }

  private setupAuthStateListener(): void {
    this.client.auth.onAuthStateChange(async (event, session) => {
      // Persist or clear session based on event
      if (this.persistSession) {
        if (session) {
          await this.tokenStorage.setSession(this.storageKey, session);
        } else {
          await this.tokenStorage.removeSession(this.storageKey);
        }
      }
      
      // Notify all registered handlers of session changes
      this.sessionChangeHandlers.forEach(handler => handler(session));
      
      // Handle specific auth events
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          // Session is valid and has been persisted
          break;
        case 'SIGNED_OUT':
          // Session has been cleared from storage
          break;
        case 'USER_UPDATED':
          // User data was updated
          break;
      }
    });
  }

  private async restoreSession(): Promise<void> {
    if (!this.persistSession) return;
    
    try {
      const storedSession = await this.tokenStorage.getSession(this.storageKey);
      if (storedSession) {
        // Validate session is not expired
        const expiresAt = storedSession.expires_at;
        if (expiresAt && expiresAt * 1000 > Date.now()) {
          // Set the session in Supabase client
          await this.client.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token,
          });
        } else {
          // Session expired, remove it
          await this.tokenStorage.removeSession(this.storageKey);
        }
      }
    } catch (error) {
      // Failed to restore session, ignore and continue
      console.error('Failed to restore session:', error);
    }
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