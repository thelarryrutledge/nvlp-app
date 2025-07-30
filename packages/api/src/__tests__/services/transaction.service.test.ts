import { TransactionService } from '../../services/transaction.service';
import { createClient } from '@supabase/supabase-js';
import { Database, ApiError, ErrorCode } from '@nvlp/types';

// Mock Supabase client
jest.mock('@supabase/supabase-js');

describe('TransactionService', () => {
  let service: TransactionService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      }
    };

    (createClient as jest.Mock).mockReturnValue(mockClient);
    service = new TransactionService(mockClient);
  });

  describe('getTransactionsByEnvelope', () => {
    it('should return transactions for a specific envelope', async () => {
      const envelopeId = 'envelope-123';
      const budgetId = 'budget-123';
      const mockTransactions = [
        { id: 'tx-1', from_envelope_id: envelopeId, amount: 100 },
        { id: 'tx-2', to_envelope_id: envelopeId, amount: 50 }
      ];

      // Mock envelope lookup
      mockClient.single.mockResolvedValueOnce({
        data: { budget_id: budgetId },
        error: null
      });

      // Mock transaction list
      mockClient.order = jest.fn().mockReturnThis();
      mockClient.or = jest.fn().mockReturnThis();
      mockClient.limit = jest.fn().mockReturnThis();
      mockClient.from.mockReturnValueOnce(mockClient); // For envelope lookup
      mockClient.from.mockReturnValueOnce(mockClient); // For budget verification
      mockClient.single.mockResolvedValueOnce({
        data: { id: budgetId },
        error: null
      });
      mockClient.from.mockReturnValueOnce(mockClient); // For transaction list
      mockClient.select.mockResolvedValueOnce({
        data: mockTransactions,
        error: null
      });

      const result = await service.getTransactionsByEnvelope(envelopeId, 10);

      expect(result).toEqual(mockTransactions);
      expect(mockClient.from).toHaveBeenCalledWith('envelopes');
      expect(mockClient.from).toHaveBeenCalledWith('transactions');
      expect(mockClient.limit).toHaveBeenCalledWith(10);
    });

    it('should throw error if envelope not found', async () => {
      const envelopeId = 'non-existent';

      mockClient.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      await expect(service.getTransactionsByEnvelope(envelopeId))
        .rejects
        .toThrow('Envelope not found');
    });
  });
});