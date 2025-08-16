import { User, Budget, Envelope, Transaction } from '@nvlp/types';

const testUser: User = {
  id: '123',
  email: 'test@example.com',
  display_name: 'Test User',
  avatar_url: 'https://example.com/avatar.png',
  default_currency: 'USD',
  default_budget_id: '456',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const testBudget: Budget = {
  id: '456',
  user_id: '123',
  name: 'Test Budget',
  description: 'Test budget description',
  currency: 'USD',
  available_amount: 1000.00,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export { testUser, testBudget };