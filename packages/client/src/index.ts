// Unified NVLP Client (RECOMMENDED)
export {
  NVLPClient,
  createNVLPClient,
  createNVLPClientFromEnv,
} from './unified-client';

export type {
  NVLPClientConfig,
  SessionProvider as NVLPSessionProvider,
} from './unified-client';

// Base HTTP Client exports
export {
  HttpClient,
  HttpError,
  NetworkError,
  TimeoutError,
  SessionInvalidatedError,
  createHttpClient,
} from './http-client';

export type {
  HttpClientConfig,
  RequestConfig,
  RetryOptions,
  TokenProvider,
  OfflineQueueConfig,
  OfflineStorage,
  QueuedRequest,
} from './http-client';

// Offline storage implementations
export {
  LocalStorage,
  AsyncStorageImpl,
  FileSystemStorage,
  createDefaultStorage,
} from './offline-storage';

// PostgREST Client exports
export {
  PostgRESTClient,
  PostgRESTQueryBuilder,
  createPostgRESTClient,
} from './postgrest-client';

export type {
  PostgRESTConfig,
  TableName,
} from './postgrest-client';

// Configuration exports
export {
  createClientFromConfig,
  defaultConfig,
  createProductionConfig,
  validateConfig,
} from './config';

export type {
  ClientConfig,
} from './config';

// Authenticated client exports
export {
  AuthenticatedPostgRESTClient,
  createAuthenticatedPostgRESTClient,
} from './authenticated-postgrest-client';

export type {
  SessionProvider,
} from './authenticated-postgrest-client';

// Services
export { DeviceService } from './services';

// Re-export Database type for convenience
export type { Database } from '@nvlp/types';