import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { AuthenticatedClient } from '../../client/authenticated-client';
import { InMemoryTokenStorage } from '../../client/token-storage';
import { ApiError, ErrorCode } from '@nvlp/types';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
  SupabaseClient: jest.fn(),
}));

describe('AuthenticatedClient', () => {
  let mockSupabaseClient: any;
  let authenticatedClient: AuthenticatedClient;
  let mockTokenStorage: InMemoryTokenStorage;
  
  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  };

  const expiredSession: Session = {
    ...mockSession,
    expires_at: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn(),
        refreshSession: jest.fn(),
        setSession: jest.fn(),
        signOut: jest.fn(),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        getUser: jest.fn(),
      },
    };

    mockTokenStorage = new InMemoryTokenStorage();
    
    authenticatedClient = new AuthenticatedClient(mockSupabaseClient, {
      tokenStorage: mockTokenStorage,
      persistSession: true,
    });
  });

  afterEach(() => {
    authenticatedClient.dispose();
  });

  describe('Session Restoration', () => {
    it('should restore valid session from storage on initialization', async () => {
      const futureSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 7200, // Expires in 2 hours
      };
      
      await mockTokenStorage.setSession('nvlp_session', futureSession);
      
      // Create new client instance
      const newClient = new AuthenticatedClient(mockSupabaseClient, {
        tokenStorage: mockTokenStorage,
        persistSession: true,
      });

      // Wait for async restoration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabaseClient.auth.setSession).toHaveBeenCalledWith({
        access_token: futureSession.access_token,
        refresh_token: futureSession.refresh_token,
      });
      
      newClient.dispose();
    });

    it('should not restore expired session from storage', async () => {
      await mockTokenStorage.setSession('nvlp_session', expiredSession);
      
      // Create new client instance
      const newClient = new AuthenticatedClient(mockSupabaseClient, {
        tokenStorage: mockTokenStorage,
        persistSession: true,
      });

      // Wait for async restoration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabaseClient.auth.setSession).not.toHaveBeenCalled();
      
      // Should remove expired session
      const storedSession = await mockTokenStorage.getSession('nvlp_session');
      expect(storedSession).toBeNull();
      
      newClient.dispose();
    });
  });

  describe('ensureValidSession', () => {
    it('should return valid session without refresh', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const session = await authenticatedClient.ensureValidSession();
      
      expect(session).toEqual(mockSession);
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
    });

    it('should refresh expired session', async () => {
      const refreshedSession = {
        ...mockSession,
        access_token: 'new-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
      });
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: refreshedSession },
      });

      const session = await authenticatedClient.ensureValidSession();
      
      expect(session).toEqual(refreshedSession);
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
    });

    it('should proactively refresh session expiring within 5 minutes', async () => {
      const soonToExpireSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 240, // Expires in 4 minutes
      };
      
      const refreshedSession = {
        ...mockSession,
        access_token: 'new-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: soonToExpireSession },
      });
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: refreshedSession },
      });

      const session = await authenticatedClient.ensureValidSession();
      
      expect(session).toEqual(refreshedSession);
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
    });

    it('should throw error when refresh fails', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
      });
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        error: { message: 'Refresh failed' },
      });

      await expect(authenticatedClient.ensureValidSession()).rejects.toThrow(
        new ApiError(
          ErrorCode.TOKEN_EXPIRED,
          'Session expired and could not be refreshed'
        )
      );
      
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should attempt to restore from storage if no session exists', async () => {
      const storedSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };
      
      await mockTokenStorage.setSession('nvlp_session', storedSession);
      
      mockSupabaseClient.auth.getSession
        .mockResolvedValueOnce({ data: { session: null } })
        .mockResolvedValueOnce({ data: { session: storedSession } });

      const session = await authenticatedClient.ensureValidSession();
      
      expect(session).toEqual(storedSession);
      expect(mockSupabaseClient.auth.setSession).toHaveBeenCalled();
    });
  });

  describe('Session Persistence', () => {
    it('should persist session on auth state change', async () => {
      const authStateCallback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
      
      // Simulate sign in
      await authStateCallback('SIGNED_IN', mockSession);
      
      const storedSession = await mockTokenStorage.getSession('nvlp_session');
      expect(storedSession).toEqual(mockSession);
    });

    it('should clear session on sign out', async () => {
      await mockTokenStorage.setSession('nvlp_session', mockSession);
      
      const authStateCallback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
      
      // Simulate sign out
      await authStateCallback('SIGNED_OUT', null);
      
      const storedSession = await mockTokenStorage.getSession('nvlp_session');
      expect(storedSession).toBeNull();
    });

    it('should update persisted session on token refresh', async () => {
      const refreshedSession = {
        ...mockSession,
        access_token: 'refreshed-token',
      };
      
      const authStateCallback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
      
      // Simulate token refresh
      await authStateCallback('TOKEN_REFRESHED', refreshedSession);
      
      const storedSession = await mockTokenStorage.getSession('nvlp_session');
      expect(storedSession).toEqual(refreshedSession);
    });
  });

  describe('Session Change Handlers', () => {
    it('should notify handlers on session change', async () => {
      const handler = jest.fn();
      const unsubscribe = authenticatedClient.onSessionChange(handler);
      
      const authStateCallback = mockSupabaseClient.auth.onAuthStateChange.mock.calls[0][0];
      
      // Simulate session change
      await authStateCallback('SIGNED_IN', mockSession);
      
      expect(handler).toHaveBeenCalledWith(mockSession);
      
      // Test unsubscribe
      unsubscribe();
      handler.mockClear();
      
      await authStateCallback('SIGNED_OUT', null);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during session operations', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error('Network error')
      );

      await expect(authenticatedClient.getSession()).rejects.toThrow();
    });

    it('should clear session when it cannot be refreshed', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
      });
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        error: { message: 'Invalid refresh token' },
      });

      try {
        await authenticatedClient.ensureValidSession();
      } catch (error) {
        // Expected error
      }

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });
});