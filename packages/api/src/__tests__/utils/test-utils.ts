/**
 * Test utilities for NVLP API testing
 * Provides common mocks, fixtures, and helper functions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@nvlp/types';

/**
 * Creates a mock Supabase client with common methods
 */
export function createMockSupabaseClient(): any {
  return {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    csv: jest.fn(),
    geojson: jest.fn(),
    explain: jest.fn(),
    rollback: jest.fn(),
    returns: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      signInWithOtp: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    rpc: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
    storage: {
      from: jest.fn().mockReturnThis(),
      list: jest.fn(),
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
    },
  };
}

/**
 * Creates a mock authenticated user session
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email_confirmed_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {
      display_name: 'Test User',
      avatar_url: null,
    },
    aud: 'authenticated',
    role: 'authenticated',
    ...overrides,
  };
}

/**
 * Creates a mock session with tokens
 */
export function createMockSession(user = createMockUser()) {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  };
}

/**
 * Sets up authentication mocks for a client
 */
export function setupAuthMocks(
  mockClient: any,
  user = createMockUser(),
  session = createMockSession(user)
) {
  mockClient.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  });

  mockClient.auth.getSession.mockResolvedValue({
    data: { session },
    error: null,
  });

  mockClient.auth.refreshSession.mockResolvedValue({
    data: { session },
    error: null,
  });
}

/**
 * Creates a mock error response
 */
export function createMockError(
  message: string,
  code?: string,
  status?: number
) {
  return {
    message,
    code,
    status,
    details: null,
    hint: null,
  };
}

/**
 * Creates a successful Supabase response
 */
export function createSuccessResponse<T>(data: T) {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };
}

/**
 * Creates an error Supabase response
 */
export function createErrorResponse(error: any) {
  return {
    data: null,
    error,
    count: null,
    status: error.status || 400,
    statusText: error.message || 'Error',
  };
}

/**
 * Delays execution for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a spy that can be used to track method calls
 */
export function createMethodSpy<T extends object>(
  obj: T,
  method: keyof T
): jest.SpyInstance {
  return jest.spyOn(obj, method as any);
}

/**
 * Resets all mocks in a mock client
 */
export function resetMockClient(mockClient: any) {
  Object.keys(mockClient).forEach(key => {
    if (typeof mockClient[key] === 'function') {
      mockClient[key].mockClear();
    } else if (typeof mockClient[key] === 'object' && mockClient[key] !== null) {
      resetMockClient(mockClient[key]);
    }
  });
}

/**
 * Mock console methods to suppress logs during testing
 */
export function suppressConsoleLogs() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  beforeAll(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });
}

/**
 * Environment variable helpers for testing
 */
export const testEnv = {
  set: (key: string, value: string) => {
    process.env[key] = value;
  },
  unset: (key: string) => {
    delete process.env[key];
  },
  restore: (originalEnv: Record<string, string | undefined>) => {
    Object.keys(originalEnv).forEach(key => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
  },
  backup: (): Record<string, string | undefined> => {
    return { ...process.env };
  },
};