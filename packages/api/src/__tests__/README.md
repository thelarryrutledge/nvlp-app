# API Test Suite

This directory contains the comprehensive test suite for the NVLP API, including test utilities, fixtures, and integration tests.

## Structure

```
__tests__/
├── client/                 # Client-specific tests
├── services/              # Service layer tests  
├── performance/           # Performance benchmark tests
├── utils/                 # Test utility functions
├── fixtures/              # Sample data for testing
├── helpers/               # Service-specific test helpers
└── setup/                 # Jest configuration and setup
```

## Test Utilities

### Core Test Utils (`utils/test-utils.ts`)

Provides essential testing utilities:

```typescript
import { createMockSupabaseClient, setupAuthMocks, createMockUser } from '@tests/utils/test-utils';

// Create a mock Supabase client
const mockClient = createMockSupabaseClient();

// Set up authentication mocks
const user = createMockUser({ id: 'custom-user-id' });
setupAuthMocks(mockClient, user);

// Create response objects
const successResponse = createSuccessResponse(data);
const errorResponse = createErrorResponse(error);
```

### Fixtures (`fixtures/index.ts`)

Sample data for all entities:

```typescript
import { sampleBudgets, sampleTransactions, createTestDataset } from '@tests/fixtures';

// Use individual fixtures
const testBudget = sampleBudgets[0];

// Get a complete dataset
const dataset = createTestDataset();

// Get related data for a budget
const budgetData = getRelatedData('budget-123');
```

### Service Test Helpers (`helpers/service-test-helpers.ts`)

Service-specific testing patterns:

```typescript
import { createServiceTestSetup, commonServiceTests } from '@tests/helpers/service-test-helpers';

// Set up a service for testing
const { service, mockClient, userId } = createServiceTestSetup(BudgetService);

// Use common test patterns
commonServiceTests.testAuthenticationRequired(() => service.getBudgets());
commonServiceTests.testEntityNotFound(() => service.getBudget('invalid-id'), 'Budget');
```

## Custom Jest Matchers

The test setup includes custom matchers for better assertions:

```typescript
// Test for valid dates
expect(createdAt).toBeValidDate();

// Test for valid UUIDs
expect(budgetId).toBeValidUUID();

// Test API errors
expect(error).toMatchApiError('VALIDATION_ERROR', 'Invalid budget');
```

## Writing Tests

### Service Tests

```typescript
import { createServiceTestSetup } from '@tests/helpers/service-test-helpers';
import { sampleBudgets } from '@tests/fixtures';
import { mockSuccessfulQuery } from '@tests/helpers/service-test-helpers';

describe('MyService', () => {
  let service: MyService;
  let mockClient: any;
  
  beforeEach(() => {
    ({ service, mockClient } = createServiceTestSetup(MyService));
  });

  it('should handle successful operations', async () => {
    mockSuccessfulQuery(mockClient, sampleBudgets[0]);
    
    const result = await service.getBudget('budget-123');
    
    expect(result).toEqual(sampleBudgets[0]);
    expect(mockClient.from).toHaveBeenCalledWith('budgets');
  });
});
```

### Error Testing

```typescript
import { errorScenarios } from '@tests/helpers/service-test-helpers';
import { ApiError, ErrorCode } from '@nvlp/types';

it('should handle database errors', async () => {
  mockClient.single.mockResolvedValue(createErrorResponse(errorScenarios.databaseError));
  
  await expect(service.getBudget('budget-123'))
    .rejects.toMatchApiError(ErrorCode.DATABASE_ERROR);
});
```

### Performance Tests

```typescript
import { performance } from 'perf_hooks';

it('should complete within acceptable time limits', async () => {
  const start = performance.now();
  
  await service.getBudgets();
  
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100); // 100ms
});
```

## Environment Variables

Test environment variables are automatically configured:

- `NODE_ENV=test`
- `SUPABASE_URL` - Test Supabase URL
- `SUPABASE_ANON_KEY` - Test anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Test service role key

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run specific test files
pnpm test budget.service.test.ts

# Run performance tests only
pnpm test:performance

# Run in watch mode
pnpm test --watch

# Run with verbose output
JEST_VERBOSE=true pnpm test
```

## Coverage

The test suite maintains high coverage standards:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Coverage reports are generated in multiple formats:
- Terminal output (text)
- LCOV format for CI integration
- HTML report for detailed viewing

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// Good
it('should throw VALIDATION_ERROR when budget name is empty')

// Bad  
it('should handle invalid input')
```

### 2. Follow AAA Pattern

```typescript
it('should create a new budget', async () => {
  // Arrange
  const budgetData = { name: 'Test Budget', currency: 'USD' };
  mockSuccessfulQuery(mockClient, sampleBudgets[0]);
  
  // Act
  const result = await service.createBudget(budgetData);
  
  // Assert
  expect(result).toEqual(sampleBudgets[0]);
  expect(mockClient.insert).toHaveBeenCalledWith(budgetData);
});
```

### 3. Test Edge Cases

```typescript
describe('edge cases', () => {
  it('should handle empty arrays')
  it('should handle null values')
  it('should handle large datasets')
  it('should handle concurrent requests')
});
```

### 4. Use Setup Helpers

```typescript
// Good - reusable setup
const { service, mockClient } = createServiceTestSetup(BudgetService);

// Bad - repetitive setup in each test
const mockClient = { from: jest.fn().mockReturnThis(), ... };
```

### 5. Mock External Dependencies

```typescript
// Mock Supabase client completely
const mockClient = createMockSupabaseClient();

// Don't make real API calls in unit tests
```

## Integration Tests

For tests that need real database interaction:

1. Use a test database instance
2. Set up and tear down test data
3. Run in isolated transactions
4. Use environment-specific configuration

## Debugging Tests

```bash
# Debug specific test with Node inspector
node --inspect-brk node_modules/.bin/jest budget.service.test.ts --runInBand

# Run single test with console output
JEST_VERBOSE=true pnpm test -- --testNamePattern="should create budget"
```