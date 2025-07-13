// Test setup file for Vitest
import { beforeEach, vi } from 'vitest';

// Mock localStorage for Node.js environment
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock global objects that might not be available in test environment
beforeEach(() => {
  vi.clearAllMocks();

  // Reset localStorage mock
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock fetch if not available
  if (!global.fetch) {
    global.fetch = vi.fn();
  }

  // Mock AbortController if not available
  if (!global.AbortController) {
    global.AbortController = vi.fn(() => ({
      abort: vi.fn(),
      signal: {
        aborted: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })) as unknown as typeof AbortController;
  }
});

// Export mocks for use in tests
export { localStorageMock };
