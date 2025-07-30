import { Session } from '@supabase/supabase-js';

/**
 * PostgREST header configuration
 */
export type PostgRESTHeaders = {
  // Required headers
  'apikey': string;
  
  // Optional headers that are commonly used
  'Authorization'?: string;
  'Content-Type'?: string;
  'Prefer'?: string;
  'Accept'?: string;
  'Accept-Profile'?: string;
  'Content-Profile'?: string;
  'Range'?: string;
  'Range-Unit'?: string;
} & Record<string, string>;

/**
 * Creates proper headers for PostgREST requests
 */
export function createPostgRESTHeaders(
  anonKey: string,
  session?: Session | null,
  options?: {
    contentType?: string;
    prefer?: string;
    acceptProfile?: string;
    contentProfile?: string;
    range?: { from: number; to: number };
    customHeaders?: Record<string, string>;
  }
): PostgRESTHeaders {
  const headers: Record<string, string> = {
    'apikey': anonKey,
    'Content-Type': options?.contentType || 'application/json',
  };

  // Add authorization header if session exists
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Add PostgREST prefer header
  if (options?.prefer) {
    headers['Prefer'] = options.prefer;
  }

  // Add profile headers for schema selection
  if (options?.acceptProfile) {
    headers['Accept-Profile'] = options.acceptProfile;
  }
  if (options?.contentProfile) {
    headers['Content-Profile'] = options.contentProfile;
  }

  // Add range header for pagination
  if (options?.range) {
    headers['Range'] = `${options.range.from}-${options.range.to}`;
    headers['Range-Unit'] = 'items';
  }

  // Add any custom headers
  if (options?.customHeaders) {
    Object.assign(headers, options.customHeaders);
  }

  return headers as PostgRESTHeaders;
}

/**
 * Common PostgREST Prefer header options
 */
export const PostgRESTPrefer = {
  // Return options
  RETURN_MINIMAL: 'return=minimal',
  RETURN_HEADERS_ONLY: 'return=headers-only',
  RETURN_REPRESENTATION: 'return=representation',
  
  // Count options
  COUNT_NONE: 'count=none',
  COUNT_EXACT: 'count=exact',
  COUNT_PLANNED: 'count=planned',
  COUNT_ESTIMATED: 'count=estimated',
  
  // Resolution options
  RESOLUTION_IGNORE_DUPLICATES: 'resolution=ignore-duplicates',
  RESOLUTION_MERGE_DUPLICATES: 'resolution=merge-duplicates',
  
  // Missing options
  MISSING_DEFAULT: 'missing=default',
  MISSING_NULL: 'missing=null',
  
  // Combination helper
  combine: (...options: string[]): string => options.join(','),
} as const;

/**
 * Creates headers for bulk operations
 */
export function createBulkOperationHeaders(
  anonKey: string,
  session?: Session | null
): PostgRESTHeaders {
  return createPostgRESTHeaders(anonKey, session, {
    prefer: PostgRESTPrefer.RETURN_REPRESENTATION,
  });
}

/**
 * Creates headers for count queries
 */
export function createCountHeaders(
  anonKey: string,
  session?: Session | null,
  countType: 'exact' | 'planned' | 'estimated' = 'exact'
): PostgRESTHeaders {
  const countPrefer = {
    exact: PostgRESTPrefer.COUNT_EXACT,
    planned: PostgRESTPrefer.COUNT_PLANNED,
    estimated: PostgRESTPrefer.COUNT_ESTIMATED,
  }[countType];

  return createPostgRESTHeaders(anonKey, session, {
    prefer: PostgRESTPrefer.combine(PostgRESTPrefer.COUNT_NONE, countPrefer),
  });
}

/**
 * Creates headers for CSV export
 */
export function createCSVExportHeaders(
  anonKey: string,
  session?: Session | null
): PostgRESTHeaders {
  return createPostgRESTHeaders(anonKey, session, {
    contentType: 'text/csv',
    customHeaders: {
      'Accept': 'text/csv',
    },
  });
}

/**
 * Creates headers for PATCH operations with return=minimal for performance
 */
export function createPatchHeaders(
  anonKey: string,
  session?: Session | null,
  returnData: boolean = true
): PostgRESTHeaders {
  return createPostgRESTHeaders(anonKey, session, {
    prefer: returnData ? PostgRESTPrefer.RETURN_REPRESENTATION : PostgRESTPrefer.RETURN_MINIMAL,
  });
}

/**
 * Creates headers for DELETE operations
 */
export function createDeleteHeaders(
  anonKey: string,
  session?: Session | null
): PostgRESTHeaders {
  return createPostgRESTHeaders(anonKey, session, {
    prefer: PostgRESTPrefer.RETURN_MINIMAL,
  });
}

/**
 * Validates that required headers are present
 */
export function validatePostgRESTHeaders(headers: Record<string, string>): boolean {
  // apikey is always required
  if (!headers['apikey']) {
    return false;
  }

  // If Authorization header exists, it should be properly formatted
  if (headers['Authorization'] && !headers['Authorization'].startsWith('Bearer ')) {
    return false;
  }

  return true;
}

/**
 * Extracts pagination info from response headers
 */
export function extractPaginationInfo(headers: Headers): {
  totalCount?: number;
  range?: { from: number; to: number };
} {
  const contentRange = headers.get('Content-Range');
  if (!contentRange) {
    return {};
  }

  // Parse Content-Range header: "0-9/100" or "0-9/*"
  const match = contentRange.match(/(\d+)-(\d+)\/(\d+|\*)/);
  if (!match) {
    return {};
  }

  const [, from, to, total] = match;
  
  return {
    range: {
      from: parseInt(from, 10),
      to: parseInt(to, 10),
    },
    totalCount: total === '*' ? undefined : parseInt(total, 10),
  };
}