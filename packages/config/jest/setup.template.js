// Jest setup file template
// Copy this file to your project root as jest.setup.js and customize as needed

// For React Native projects, uncomment:
// import '@testing-library/jest-native/extend-expect';

// For jsdom projects, uncomment:
// import '@testing-library/jest-dom';

// Global test setup
beforeEach(() => {
  // Reset any mocks or test state before each test
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllMocks();
});

// Mock common APIs that might not be available in test environment
global.fetch = global.fetch || jest.fn();

// For Node.js environments, mock browser APIs
if (typeof window === 'undefined') {
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  
  global.AbortController = global.AbortController || class AbortController {
    constructor() {
      this.signal = { aborted: false };
    }
    abort() {
      this.signal.aborted = true;
    }
  };
}