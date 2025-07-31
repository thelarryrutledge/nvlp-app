/**
 * Service-specific test helpers for NVLP API
 * Provides common patterns for testing services
 */

import { ApiError, ErrorCode } from '@nvlp/types';
import { createMockSupabaseClient, setupAuthMocks, createSuccessResponse, createErrorResponse } from '../utils/test-utils';

/**
 * Creates a service test setup with common mocks
 */
export function createServiceTestSetup<T>(
  ServiceClass: new (client: any) => T,
  userId = 'test-user-id'
) {
  const mockClient = createMockSupabaseClient();
  setupAuthMocks(mockClient, { id: userId });
  
  const service = new ServiceClass(mockClient);
  
  return {
    service,
    mockClient,
    userId,
  };
}

/**
 * Mock a successful database query chain
 */
export function mockSuccessfulQuery<T>(mockClient: any, data: T) {
  mockClient.single.mockResolvedValueOnce(createSuccessResponse(data));
  return mockClient;
}

/**
 * Mock a failed database query chain
 */
export function mockFailedQuery(mockClient: any, error: any) {
  mockClient.single.mockResolvedValueOnce(createErrorResponse(error));
  return mockClient;
}

/**
 * Mock a successful list query
 */
export function mockSuccessfulListQuery<T>(mockClient: any, data: T[]) {
  mockClient.single.mockResolvedValueOnce(createSuccessResponse(data));
  return mockClient;
}

/**
 * Test cases for common service patterns
 */
export const commonServiceTests = {
  /**
   * Test authentication requirement
   */
  testAuthenticationRequired: (testFn: () => Promise<any>) => {
    it('should throw UNAUTHORIZED when user is not authenticated', async () => {
      await expect(testFn()).rejects.toThrow(
        new ApiError(ErrorCode.UNAUTHORIZED, 'User not authenticated')
      );
    });
  },

  /**
   * Test budget access verification
   */
  testBudgetAccessRequired: (testFn: () => Promise<any>) => {
    it('should throw FORBIDDEN when user does not have access to budget', async () => {
      await expect(testFn()).rejects.toThrow(
        new ApiError(ErrorCode.FORBIDDEN, expect.any(String))
      );
    });
  },

  /**
   * Test entity not found scenarios
   */
  testEntityNotFound: (testFn: () => Promise<any>, entityName: string) => {
    it(`should throw NOT_FOUND when ${entityName} does not exist`, async () => {
      await expect(testFn()).rejects.toThrow(
        new ApiError(ErrorCode.NOT_FOUND, expect.stringContaining(entityName))
      );
    });
  },

  /**
   * Test validation errors
   */
  testValidationError: (testFn: () => Promise<any>) => {
    it('should throw VALIDATION_ERROR for invalid input', async () => {
      await expect(testFn()).rejects.toThrow(
        new ApiError(ErrorCode.VALIDATION_ERROR, expect.any(String))
      );
    });
  },

  /**
   * Test successful operations
   */
  testSuccessfulOperation: <T>(testFn: () => Promise<T>, expectedResult: T) => {
    it('should complete successfully with valid input', async () => {
      const result = await testFn();
      expect(result).toEqual(expectedResult);
    });
  },
};

/**
 * Helper to mock budget access verification
 */
export function mockBudgetAccess(
  mockClient: any,
  budgetId: string,
  userId: string,
  hasAccess = true
) {
  if (hasAccess) {
    mockClient.single.mockResolvedValueOnce(
      createSuccessResponse({ id: budgetId, user_id: userId })
    );
  } else {
    mockClient.single.mockResolvedValueOnce(
      createSuccessResponse(null)
    );
  }
}

/**
 * Helper to mock transaction validation patterns
 */
export function mockTransactionValidation(mockClient: any) {
  // Mock envelope balance checks
  mockClient.single
    .mockResolvedValueOnce(createSuccessResponse({ current_balance: 100 }))
    .mockResolvedValueOnce(createSuccessResponse({ current_balance: 50 }));
  
  // Mock entity existence checks
  mockClient.single
    .mockResolvedValueOnce(createSuccessResponse({ id: 'payee-1' }))
    .mockResolvedValueOnce(createSuccessResponse({ id: 'envelope-1' }))
    .mockResolvedValueOnce(createSuccessResponse({ id: 'income-1' }));
}

/**
 * Helper to create error scenarios for testing
 */
export const errorScenarios = {
  networkError: new Error('Network request failed'),
  
  databaseError: {
    message: 'Database connection failed',
    code: 'CONNECTION_ERROR',
    status: 500,
  },
  
  permissionError: {
    message: 'Permission denied',
    code: 'INSUFFICIENT_PRIVILEGES',
    status: 403,
  },
  
  notFoundError: {
    message: 'Record not found',
    code: 'PGRST116',
    status: 404,
  },
  
  uniqueConstraintError: {
    message: 'Unique constraint violation',
    code: '23505',
    status: 409,
  },
  
  foreignKeyError: {
    message: 'Foreign key constraint violation',
    code: '23503',
    status: 409,
  },
};

/**
 * Helper to test service method with different scenarios
 */
export function testServiceMethod<T, Args extends any[]>(
  method: (...args: Args) => Promise<T>,
  scenarios: {
    name: string;
    args: Args;
    mockSetup: () => void;
    expectation: (result?: T, error?: Error) => void;
  }[]
) {
  scenarios.forEach(scenario => {
    it(scenario.name, async () => {
      scenario.mockSetup();
      
      try {
        const result = await method(...scenario.args);
        scenario.expectation(result);
      } catch (error) {
        scenario.expectation(undefined, error as Error);
      }
    });
  });
}

/**
 * Helper to create pagination test scenarios
 */
export function createPaginationTests<T>(
  method: (limit?: number, offset?: number) => Promise<T[]>,
  sampleData: T[]
) {
  return [
    {
      name: 'should return all items when no pagination specified',
      args: [undefined, undefined] as const,
      mockSetup: () => mockSuccessfulListQuery(createMockSupabaseClient(), sampleData),
      expectation: (result?: T[]) => {
        expect(result).toEqual(sampleData);
      },
    },
    {
      name: 'should limit results when limit specified',
      args: [2, undefined] as const,
      mockSetup: () => mockSuccessfulListQuery(createMockSupabaseClient(), sampleData.slice(0, 2)),
      expectation: (result?: T[]) => {
        expect(result).toHaveLength(2);
      },
    },
    {
      name: 'should offset results when offset specified',
      args: [undefined, 1] as const,
      mockSetup: () => mockSuccessfulListQuery(createMockSupabaseClient(), sampleData.slice(1)),
      expectation: (result?: T[]) => {
        expect(result).toEqual(sampleData.slice(1));
      },
    },
  ];
}