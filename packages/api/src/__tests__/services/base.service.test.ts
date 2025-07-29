import { SupabaseClient } from '@supabase/supabase-js';
import { BaseService } from '../../services/base.service';
import { ApiError, ErrorCode } from '@nvlp/types';

// Create a concrete implementation for testing
class TestService extends BaseService {
  async testWithTokenRefresh<T>(operation: () => Promise<T>): Promise<T> {
    return this.withTokenRefresh(operation);
  }

  async testWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    delay?: number
  ): Promise<T> {
    return this.withRetry(operation, maxRetries, delay);
  }
}

describe('BaseService', () => {
  let mockSupabaseClient: any;
  let testService: TestService;
  
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockSession = {
    access_token: 'new-token',
    refresh_token: 'new-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
        refreshSession: jest.fn(),
      },
    };

    testService = new TestService(mockSupabaseClient as SupabaseClient<any>);
  });

  describe('withTokenRefresh', () => {
    it('should execute operation successfully without refresh', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await testService.testWithTokenRefresh(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
    });

    it('should refresh token on 401 error and retry', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({ status: 401, message: 'Unauthorized' })
        .mockResolvedValueOnce('success after refresh');
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const result = await testService.testWithTokenRefresh(mockOperation);
      
      expect(result).toBe('success after refresh');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalledTimes(1);
    });

    it('should handle various token error patterns', async () => {
      const errorPatterns = [
        { code: 'PGRST301' },
        { code: 'PGRST401' },
        { message: 'JWT expired' },
        { message: 'Invalid token' },
        { message: 'Token is malformed' },
        { message: 'Request unauthorized' },
      ];

      for (const errorPattern of errorPatterns) {
        const mockOperation = jest.fn()
          .mockRejectedValueOnce(errorPattern)
          .mockResolvedValueOnce('success');
        
        mockSupabaseClient.auth.refreshSession.mockResolvedValue({
          data: { session: mockSession },
        });

        const result = await testService.testWithTokenRefresh(mockOperation);
        
        expect(result).toBe('success');
        expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
      }
    });

    it('should throw TOKEN_EXPIRED error when refresh fails', async () => {
      const mockOperation = jest.fn().mockRejectedValue({ status: 401 });
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        error: { message: 'Refresh failed' },
      });

      await expect(testService.testWithTokenRefresh(mockOperation))
        .rejects.toThrow(new ApiError(
          ErrorCode.TOKEN_EXPIRED,
          'Session expired and could not be refreshed'
        ));
    });

    it('should throw SERVICE_UNAVAILABLE on network errors during refresh', async () => {
      const mockOperation = jest.fn().mockRejectedValue({ status: 401 });
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        error: { message: 'network request failed' },
      });

      await expect(testService.testWithTokenRefresh(mockOperation))
        .rejects.toThrow(new ApiError(
          ErrorCode.SERVICE_UNAVAILABLE,
          'Unable to refresh token due to network error'
        ));
    });

    it('should throw UNAUTHORIZED if retry still fails after refresh', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue({ status: 401 });
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
      });

      await expect(testService.testWithTokenRefresh(mockOperation))
        .rejects.toThrow(new ApiError(
          ErrorCode.UNAUTHORIZED,
          'Authentication failed after token refresh'
        ));
    });

    it('should pass through non-auth errors', async () => {
      const error = new Error('Database error');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(testService.testWithTokenRefresh(mockOperation))
        .rejects.toThrow(error);
      
      expect(mockSupabaseClient.auth.refreshSession).not.toHaveBeenCalled();
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      // Mock timers for testing delays
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry operation with token refresh on failure', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce({ status: 401 })
        .mockResolvedValueOnce('success');
      
      mockSupabaseClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const promise = testService.testWithRetry(mockOperation, 3, 100);
      
      // Fast-forward timers
      jest.runAllTimers();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockSupabaseClient.auth.refreshSession).toHaveBeenCalled();
    });

    it('should not retry on non-recoverable errors', async () => {
      const nonRecoverableErrors = [
        new ApiError(ErrorCode.NOT_FOUND, 'Not found'),
        new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid data'),
        new ApiError(ErrorCode.INVALID_REQUEST, 'Bad request'),
      ];

      for (const error of nonRecoverableErrors) {
        const mockOperation = jest.fn().mockRejectedValue(error);
        
        await expect(testService.testWithRetry(mockOperation))
          .rejects.toThrow(error);
        
        expect(mockOperation).toHaveBeenCalledTimes(1);
      }
    });

    it('should retry with exponential backoff', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Still failing'))
        .mockResolvedValueOnce('success');

      const result = await testService.testWithRetry(mockOperation, 3, 10); // Use shorter delay
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should throw last error after max retries', async () => {
      jest.useRealTimers(); // Use real timers for this test
      
      const error = new Error('Persistent error');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(testService.testWithRetry(mockOperation, 2, 10))
        .rejects.toThrow(error);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('getCurrentUserId', () => {
    it('should return user ID when authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
      });

      const userId = await testService['getCurrentUserId']();
      
      expect(userId).toBe('user-123');
    });

    it('should throw UNAUTHORIZED when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      await expect(testService['getCurrentUserId']())
        .rejects.toThrow(new ApiError(
          ErrorCode.UNAUTHORIZED,
          'User not authenticated'
        ));
    });

    it('should throw UNAUTHORIZED on auth error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        error: { message: 'Auth error' },
        data: { user: null },
      });

      await expect(testService['getCurrentUserId']())
        .rejects.toThrow(new ApiError(
          ErrorCode.UNAUTHORIZED,
          'User not authenticated'
        ));
    });
  });
});