/**
 * Test file to verify monorepo package resolution
 */

import type { User, Budget, Envelope, Transaction } from '@nvlp/types';

// Test type imports are working
const testTypeImports = (): void => {
  const user: Partial<User> = {
    email: 'test@example.com',
  };

  const budget: Partial<Budget> = {
    name: 'Test Budget',
  };

  const envelope: Partial<Envelope> = {
    name: 'Test Envelope',
  };

  const transaction: Partial<Transaction> = {
    amount: 100,
  };

  console.log('Monorepo types imported successfully:', {
    user,
    budget,
    envelope,
    transaction,
  });
};

export { testTypeImports };