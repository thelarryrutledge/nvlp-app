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

// Re-export Database type for convenience
export type { Database } from '@nvlp/types';