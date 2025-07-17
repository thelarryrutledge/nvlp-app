import { describe, expect, it } from 'vitest';

// This is a placeholder test to verify the build configuration works
// Real tests will be added when we move the client code
describe('@nvlp/client', () => {
  it('should have a basic test setup', () => {
    expect(true).toBe(true);
  });

  it('should have access to global mocks', () => {
    expect(global.fetch).toBeDefined();
    expect(global.AbortController).toBeDefined();
    expect(window.localStorage).toBeDefined();
  });
});
