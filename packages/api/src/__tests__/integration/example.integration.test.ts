/**
 * Example integration test demonstrating test utilities usage
 * This shows how to use the test infrastructure for integration testing
 */

import { ApiError, ErrorCode, TransactionType } from '@nvlp/types';
import { BaseService } from '../../services/base.service';
import { 
  createMockSupabaseClient, 
  setupAuthMocks, 
  createMockUser,
  createSuccessResponse,
  createErrorResponse 
} from '../utils/test-utils';
import { 
  createServiceTestSetup,
  mockSuccessfulQuery,
  mockFailedQuery,
  errorScenarios,
  commonServiceTests
} from '../helpers/service-test-helpers';
import { sampleBudgets, sampleTransactions, createTestDataset } from '../fixtures';

// Example service for demonstration
class ExampleService extends BaseService {
  async getExampleData(id: string) {
    const userId = await this.getCurrentUserId();
    
    const { data, error } = await this.client
      .from('examples')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new ApiError(ErrorCode.NOT_FOUND, 'Example not found');
    }

    return data;
  }

  async createExample(input: { name: string; value: number }) {
    if (!input.name) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Name is required');
    }

    if (input.value < 0) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, 'Value must be non-negative');
    }

    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from('examples')
      .insert({
        ...input,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(ErrorCode.DATABASE_ERROR, 'Failed to create example');
    }

    return data;
  }
}

describe('Example Integration Test', () => {
  let service: ExampleService;
  let mockClient: any;
  let userId: string;
  
  beforeEach(() => {
    ({ service, mockClient, userId } = createServiceTestSetup(ExampleService));
  });

  describe('Test Utilities Usage', () => {
    it('should demonstrate mock client setup', async () => {
      // Mock a successful query
      mockClient.eq.mockReturnValueOnce(mockClient).mockReturnValueOnce(mockClient);
      mockSuccessfulQuery(mockClient, { id: '123', name: 'Test', user_id: userId });

      const result = await service.getExampleData('123');

      expect(result).toEqual({ id: '123', name: 'Test', user_id: userId });
      expect(mockClient.from).toHaveBeenCalledWith('examples');
      expect(mockClient.select).toHaveBeenCalledWith('*');
    });

    it('should demonstrate error handling', async () => {
      mockClient.eq.mockReturnValueOnce(mockClient).mockReturnValueOnce(mockClient);
      mockFailedQuery(mockClient, errorScenarios.notFoundError);

      await expect(service.getExampleData('non-existent'))
        .rejects.toThrow(new ApiError(ErrorCode.NOT_FOUND, 'Example not found'));
    });

    it('should demonstrate validation testing', async () => {
      await expect(service.createExample({ name: '', value: 10 }))
        .rejects.toThrow(new ApiError(ErrorCode.VALIDATION_ERROR, 'Name is required'));

      await expect(service.createExample({ name: 'Test', value: -5 }))
        .rejects.toThrow(new ApiError(ErrorCode.VALIDATION_ERROR, 'Value must be non-negative'));
    });
  });

  describe('Fixture Usage', () => {
    it('should demonstrate using sample data', () => {
      const dataset = createTestDataset();
      
      expect(dataset.budgets).toHaveLength(2);
      expect(dataset.transactions).toHaveLength(4);
      expect(dataset.budgets[0]).toEqual(sampleBudgets[0]);
    });

    it('should demonstrate filtering fixtures', () => {
      const incomeTransactions = sampleTransactions.filter(
        t => t.type === TransactionType.INCOME
      );
      
      expect(incomeTransactions).toHaveLength(1);
      expect(incomeTransactions[0].income_source_id).toBeTruthy();
    });
  });

  describe('Custom Matchers', () => {
    it('should demonstrate custom UUID matcher', () => {
      const validUuid = 'a1b2c3d4-e5f6-4789-8012-123456789012';
      const invalidUuid = 'not-a-uuid';
      
      expect(validUuid).toBeValidUUID();
      expect(invalidUuid).not.toBeValidUUID();
    });

    it('should demonstrate custom date matcher', () => {
      const validDate = new Date('2024-01-01');
      const invalidDate = new Date('invalid');
      
      expect(validDate).toBeValidDate();
      expect(invalidDate).not.toBeValidDate();
    });

    it('should demonstrate API error matcher', () => {
      const error = new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid input: field is required');
      
      expect(error).toMatchApiError(ErrorCode.VALIDATION_ERROR);
      expect(error).toMatchApiError(ErrorCode.VALIDATION_ERROR, 'field is required');
    });
  });

  describe('Common Test Patterns', () => {
    // Using the common test helpers
    commonServiceTests.testAuthenticationRequired(
      async () => {
        // Mock no user
        mockClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });
        return service.getExampleData('123');
      }
    );

    commonServiceTests.testEntityNotFound(
      async () => {
        mockClient.eq.mockReturnValueOnce(mockClient).mockReturnValueOnce(mockClient);
        mockSuccessfulQuery(mockClient, null);
        return service.getExampleData('non-existent');
      },
      'Example'
    );

    commonServiceTests.testSuccessfulOperation(
      async () => {
        const mockData = { id: '123', name: 'Success', user_id: userId };
        mockClient.eq.mockReturnValueOnce(mockClient).mockReturnValueOnce(mockClient);
        mockSuccessfulQuery(mockClient, mockData);
        return service.getExampleData('123');
      },
      { id: '123', name: 'Success', user_id: 'test-user-id' }
    );
  });

  describe('Async Operations', () => {
    it('should handle async operations with delays', async () => {
      const mockData = { id: '123', name: 'Async Test' };
      
      mockClient.insert.mockReturnValueOnce(mockClient);
      mockClient.select.mockReturnValueOnce(mockClient);
      
      // Simulate async delay using real timers
      jest.useRealTimers();
      
      mockClient.single.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(createSuccessResponse(mockData)), 100)
        )
      );

      const start = performance.now();
      const result = await service.createExample({ name: 'Async Test', value: 42 });
      const duration = performance.now() - start;

      expect(result).toEqual(mockData);
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some variance
      
      // Restore fake timers
      jest.useFakeTimers();
    });
  });
});