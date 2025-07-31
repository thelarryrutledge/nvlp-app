/**
 * Jest setup file for NVLP API tests
 * Configures global test environment and common setup
 */

import 'dotenv/config';

// Extend Jest matchers for better assertions
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },

  toBeValidUUID(received: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toMatchApiError(received: any, expectedCode: string, expectedMessage?: string) {
    const isApiError = received && received.code && received.message;
    if (!isApiError) {
      return {
        message: () => `expected ${received} to be an ApiError`,
        pass: false,
      };
    }

    const codeMatches = received.code === expectedCode;
    const messageMatches = expectedMessage ? received.message.includes(expectedMessage) : true;
    
    const pass = codeMatches && messageMatches;
    
    if (pass) {
      return {
        message: () => `expected error not to match code ${expectedCode}${expectedMessage ? ` and message containing "${expectedMessage}"` : ''}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected error to match code ${expectedCode}${expectedMessage ? ` and message containing "${expectedMessage}"` : ''}, got code ${received.code} and message "${received.message}"`,
        pass: false,
      };
    }
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidUUID(): R;
      toMatchApiError(expectedCode: string, expectedMessage?: string): R;
    }
  }
}

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Mock console methods by default to reduce noise in tests
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

// Suppress console output in tests unless explicitly enabled
if (!process.env.JEST_VERBOSE) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
}

// Restore console for specific tests if needed
(global as any).restoreConsole = () => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
};

// Global test environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

// Mock timers for tests that need precise timing control
beforeEach(() => {
  // Reset Date.now() to a consistent time for tests
  jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01T00:00:00Z').getTime());
});

afterEach(() => {
  // Restore all mocks after each test
  jest.restoreAllMocks();
  jest.clearAllTimers();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Helper to run tests with real timers
(global as any).useRealTimers = () => {
  beforeEach(() => {
    jest.useRealTimers();
  });
  
  afterEach(() => {
    jest.useFakeTimers();
  });
};

export {};