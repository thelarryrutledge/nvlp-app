// Jest setup file for NVLP Mobile App
import '@testing-library/jest-native/extend-expect';

// Mock React Native modules that are not available in test environment
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
  useNetInfo: jest.fn(() => ({ isConnected: true })),
}));

// Mock react-native-config
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://localhost:3000',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'test-key',
}));

// Mock Flipper
jest.mock('react-native-flipper', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Global test setup
beforeEach(() => {
  // Reset any mocks or test state before each test
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllMocks();
});

// Increase timeout for React Native tests
jest.setTimeout(10000);