import { SupabaseClient, Session } from '@supabase/supabase-js';
import { Database, ApiError, ErrorCode } from '@nvlp/types';
import { TokenStorage, InMemoryTokenStorage } from './token-storage';
import { SessionMonitor } from './session-monitor';

export interface SessionChangeHandler {
  (session: Session | null): void;
}

export interface AuthenticatedClientOptions {
  tokenStorage?: TokenStorage;
  storageKey?: string;
  persistSession?: boolean;
  enableSessionMonitor?: boolean;
  sessionCheckInterval?: number;
  sessionRefreshThreshold?: number;
}

export class AuthenticatedClient {
  private client: SupabaseClient<Database>;
  private sessionChangeHandlers: SessionChangeHandler[] = [];
  private tokenStorage: TokenStorage;
  private storageKey: string;
  private persistSession: boolean;
  private sessionMonitor?: SessionMonitor;

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
    
    // Set up session monitor if enabled
    if (options.enableSessionMonitor) {
      this.sessionMonitor = new SessionMonitor(client, {
        checkInterval: options.sessionCheckInterval,
        refreshThreshold: options.sessionRefreshThreshold,
        onRefreshError: (error) => {
          console.error('Session refresh error:', error);
        },
        onSessionRefreshed: (session) => {
          // Persist the refreshed session
          if (this.persistSession) {
            this.tokenStorage.setSession(this.storageKey, session);
          }
        },
      });
      this.sessionMonitor.start();
    }
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
    
    // If no session exists, try to restore from storage
    if (!session && this.persistSession) {
      await this.restoreSession();
      const restored = await this.client.auth.getSession();
      session = restored.data.session;
      error = restored.error;
    }
    
    if (error || !session) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        'No active session',
        error
      );
    }

    // Check if token is expired or about to expire
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Date.now();
      const expirationTime = expiresAt * 1000;
      const timeUntilExpiry = expirationTime - now;
      
      // Token is expired
      if (timeUntilExpiry <= 0) {
        const refreshResult = await this.client.auth.refreshSession();
        if (refreshResult.error || !refreshResult.data.session) {
          // Clear invalid session
          await this.clearSession();
          throw new ApiError(
            ErrorCode.TOKEN_EXPIRED,
            'Session expired and could not be refreshed',
            refreshResult.error
          );
        }
        session = refreshResult.data.session;
      }
      // Token expires within 5 minutes - proactively refresh
      else if (timeUntilExpiry < 300000) {
        // Attempt refresh but don't fail if it doesn't work yet
        const refreshResult = await this.client.auth.refreshSession();
        if (refreshResult.data.session) {
          session = refreshResult.data.session;
        }
      }
    }

    return session;
  }

  async clearSession(): Promise<void> {
    await this.client.auth.signOut();
    if (this.persistSession) {
      await this.tokenStorage.removeSession(this.storageKey);
    }
  }

  getSupabaseClient(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Clean up resources (e.g., stop session monitor)
   */
  dispose(): void {
    if (this.sessionMonitor) {
      this.sessionMonitor.stop();
      this.sessionMonitor = undefined;
    }
  }
}