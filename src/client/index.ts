/**
 * NVLP Client Library
 * 
 * Abstract client library providing a consistent interface for both 
 * PostgREST direct calls and Edge Function complex operations.
 */

export { NVLPClient } from './nvlp-client';
export { PostgRESTTransport } from './transports/postgrest-transport';
export { EdgeFunctionTransport } from './transports/edge-function-transport';

export * from './types';
export * from './errors';