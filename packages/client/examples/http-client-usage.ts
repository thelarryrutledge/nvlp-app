import { createHttpClient, HttpError, NetworkError, TimeoutError } from '../src';

async function httpClientExample() {
  // Create an HTTP client with retry logic
  const client = createHttpClient({
    baseUrl: 'https://api.example.com',
    defaultHeaders: {
      'User-Agent': 'NVLP-Client/1.0.0'
    },
    timeout: 30000,
    retryOptions: {
      maxAttempts: 3,
      delay: 1000,
      backoff: 'exponential',
      shouldRetry: (error) => {
        // Retry on network errors and 5xx server errors
        if (error instanceof NetworkError) return true;
        if (error instanceof HttpError) {
          return error.status >= 500 && error.status < 600;
        }
        return false;
      }
    }
  });

  try {
    // GET request with automatic retry
    const data = await client.get('/api/data');
    console.log('GET response:', data);

    // POST request with JSON body
    const newRecord = await client.post('/api/records', {
      name: 'Test Record',
      value: 123
    });
    console.log('Created record:', newRecord);

    // PATCH request with custom headers
    const updated = await client.patch('/api/records/1', 
      { value: 456 },
      { 
        headers: { 'If-Match': '"etag-value"' },
        retryOptions: { maxAttempts: 1 } // Override retry for this request
      }
    );
    console.log('Updated record:', updated);

    // Request with custom timeout
    const slowData = await client.get('/api/slow-endpoint', {
      timeout: 60000 // 60 second timeout
    });
    console.log('Slow data:', slowData);

  } catch (error) {
    if (error instanceof HttpError) {
      console.error(`HTTP Error ${error.status}: ${error.statusText}`);
    } else if (error instanceof NetworkError) {
      console.error('Network Error:', error.message);
    } else if (error instanceof TimeoutError) {
      console.error('Request timed out:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
  }

  // Update client configuration
  client.setDefaultHeaders({ 'Authorization': 'Bearer token123' });
  client.setBaseUrl('https://api.newdomain.com');

  // Use the updated client
  const authenticatedData = await client.get('/protected-endpoint');
  console.log('Authenticated data:', authenticatedData);
}

// Example usage with different retry strategies
async function customRetryExample() {
  const client = createHttpClient({
    baseUrl: 'https://api.example.com',
    retryOptions: {
      maxAttempts: 5,
      delay: 500,
      backoff: 'linear',
      shouldRetry: (error) => {
        // Custom retry logic
        if (error instanceof HttpError) {
          // Retry on 429 (rate limit) and 503 (service unavailable)
          return error.status === 429 || error.status === 503;
        }
        return error instanceof NetworkError;
      }
    }
  });

  try {
    const result = await client.get('/api/rate-limited-endpoint');
    console.log('Rate limited result:', result);
  } catch (error) {
    console.error('Failed after retries:', error);
  }
}

export { httpClientExample, customRetryExample };