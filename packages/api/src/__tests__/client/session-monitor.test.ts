import { SessionMonitor } from '../../client/session-monitor';
import { Session } from '@supabase/supabase-js';

describe('SessionMonitor', () => {
  let mockSupabaseClient: any;
  let sessionMonitor: SessionMonitor;
  let onRefreshError: jest.Mock;
  let onSessionRefreshed: jest.Mock;
  
  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn(),
        refreshSession: jest.fn(),
      },
    };

    onRefreshError = jest.fn();
    onSessionRefreshed = jest.fn();
    
    sessionMonitor = new SessionMonitor(mockSupabaseClient, {
      checkInterval: 60000, // 1 minute
      refreshThreshold: 300000, // 5 minutes
      onRefreshError,
      onSessionRefreshed,
    });
  });

  afterEach(() => {
    sessionMonitor.stop();
    jest.useRealTimers();
  });

  describe('start/stop', () => {
    it('should start monitoring and check session immediately', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      sessionMonitor.start();
      
      // Wait for immediate check
      await Promise.resolve();
      
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should check session periodically', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      sessionMonitor.start();
      
      // Initial check
      await Promise.resolve();
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1);
      
      // Advance timer by 1 minute
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
      
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(2);
      
      // Advance timer by another minute
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
      
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(3);
    });

    it('should not start multiple monitors', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      sessionMonitor.start();
      sessionMonitor.start(); // Try to start again
      
      await Promise.resolve();
      
      // Should only check once despite two start calls
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1);
    });

    it('should stop monitoring', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });

      sessionMonitor.start();
      await Promise.resolve();
      
      sessionMonitor.stop();
      
      // Clear previous calls
      mockSupabaseClient.auth.getSession.mockClear();
      
      // Advance timer - should not trigger check
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
      
      expect(mockSupabaseClient.auth.getSession).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token when approaching expiration', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const sessionNearExpiry = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 240, // Expires in 4 minutes
      };
      
      const refreshedSession = {
        ...mockSession,
        access_token: 'new-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sessionNearExpiry },
      });
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: refreshedSession },
      });

      sessionMonitor.start();
      
      // Wait for the check to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
      expect(onSessionRefreshed).toHaveBeenCalledWith(refreshedSession);
    }, 10000);

    it('should not refresh token with plenty of time remaining', async () => {
      const sessionWithTime = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 600, // Expires in 10 minutes
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sessionWithTime },
      });

      sessionMonitor.start();
      await Promise.resolve();
      
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
    });

    it('should not refresh already expired token', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) - 100, // Expired 100 seconds ago
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
      });

      sessionMonitor.start();
      await Promise.resolve();
      
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const sessionNearExpiry = {
        ...mockSession,
        expires_at: Math.floor(Date.now() / 1000) + 240,
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: sessionNearExpiry },
      });
      
      const refreshError = new Error('Network error');
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        error: refreshError,
      });

      sessionMonitor.start();
      
      // Wait for the check to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(onRefreshError).toHaveBeenCalled();
      expect(onRefreshError.mock.calls[0][0].message).toContain('Failed to refresh session');
    }, 10000);

    it('should handle no session gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      sessionMonitor.start();
      await Promise.resolve();
      
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
      expect(onRefreshError).not.toHaveBeenCalled();
    });
  });

  describe('forceRefresh', () => {
    it('should force refresh session', async () => {
      const refreshedSession = {
        ...mockSession,
        access_token: 'force-refreshed-token',
      };

      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: refreshedSession },
      });

      const result = await sessionMonitor.forceRefresh();
      
      expect(result).toEqual(refreshedSession);
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
    });

    it('should throw and call error handler on force refresh failure', async () => {
      const error = { message: 'Refresh failed' };
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        error,
      });

      await expect(sessionMonitor.forceRefresh()).rejects.toThrow('Failed to refresh session');
      expect(onRefreshError).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should not crash on monitor errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error('Unexpected error')
      );

      sessionMonitor.start();
      await Promise.resolve();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Session monitor error:',
        expect.any(Error)
      );
      
      // Monitor should continue running
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
      });
      
      jest.advanceTimersByTime(60000);
      await Promise.resolve();
      
      // Should still be checking
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});