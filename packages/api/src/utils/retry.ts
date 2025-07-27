export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  shouldRetry?: (error: any) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    shouldRetry = () => true
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === maxAttempts - 1) {
        throw error;
      }

      const waitTime = backoff === 'exponential' 
        ? delay * Math.pow(2, attempt)
        : delay * (attempt + 1);

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

export function createRetryableOperation<T>(
  operation: () => Promise<T>,
  defaultOptions: RetryOptions = {}
) {
  return (overrides?: RetryOptions) => 
    withRetry(operation, { ...defaultOptions, ...overrides });
}