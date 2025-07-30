import { Session } from '@supabase/supabase-js';
import {
  createPostgRESTHeaders,
  PostgRESTPrefer,
  createBulkOperationHeaders,
  createCountHeaders,
  createCSVExportHeaders,
  createPatchHeaders,
  createDeleteHeaders,
  validatePostgRESTHeaders,
  extractPaginationInfo,
} from '../../utils/postgrest-headers';

describe('PostgREST Headers', () => {
  const mockAnonKey = 'test-anon-key';
  const mockSession: Session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  };

  describe('createPostgRESTHeaders', () => {
    it('should create basic headers with apikey', () => {
      const headers = createPostgRESTHeaders(mockAnonKey);
      
      expect(headers).toEqual({
        'apikey': mockAnonKey,
        'Content-Type': 'application/json',
      });
    });

    it('should include Authorization header when session is provided', () => {
      const headers = createPostgRESTHeaders(mockAnonKey, mockSession);
      
      expect(headers).toEqual({
        'apikey': mockAnonKey,
        'Authorization': `Bearer ${mockSession.access_token}`,
        'Content-Type': 'application/json',
      });
    });

    it('should include all optional headers', () => {
      const headers = createPostgRESTHeaders(mockAnonKey, mockSession, {
        contentType: 'text/csv',
        prefer: 'return=representation',
        acceptProfile: 'custom',
        contentProfile: 'custom',
        range: { from: 0, to: 9 },
        customHeaders: {
          'X-Custom': 'value',
        },
      });

      expect(headers).toEqual({
        'apikey': mockAnonKey,
        'Authorization': `Bearer ${mockSession.access_token}`,
        'Content-Type': 'text/csv',
        'Prefer': 'return=representation',
        'Accept-Profile': 'custom',
        'Content-Profile': 'custom',
        'Range': '0-9',
        'Range-Unit': 'items',
        'X-Custom': 'value',
      });
    });

    it('should not include Authorization header when session is null', () => {
      const headers = createPostgRESTHeaders(mockAnonKey, null);
      
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('Specialized header creators', () => {
    it('createBulkOperationHeaders should include return=representation', () => {
      const headers = createBulkOperationHeaders(mockAnonKey, mockSession);
      
      expect(headers['Prefer']).toBe('return=representation');
    });

    it('createCountHeaders should include correct count preference', () => {
      const exactHeaders = createCountHeaders(mockAnonKey, mockSession, 'exact');
      expect(exactHeaders['Prefer']).toBe('count=none,count=exact');

      const plannedHeaders = createCountHeaders(mockAnonKey, mockSession, 'planned');
      expect(plannedHeaders['Prefer']).toBe('count=none,count=planned');

      const estimatedHeaders = createCountHeaders(mockAnonKey, mockSession, 'estimated');
      expect(estimatedHeaders['Prefer']).toBe('count=none,count=estimated');
    });

    it('createCSVExportHeaders should set CSV content type', () => {
      const headers = createCSVExportHeaders(mockAnonKey, mockSession);
      
      expect(headers['Content-Type']).toBe('text/csv');
      expect(headers['Accept']).toBe('text/csv');
    });

    it('createPatchHeaders should handle return data preference', () => {
      const withDataHeaders = createPatchHeaders(mockAnonKey, mockSession, true);
      expect(withDataHeaders['Prefer']).toBe('return=representation');

      const withoutDataHeaders = createPatchHeaders(mockAnonKey, mockSession, false);
      expect(withoutDataHeaders['Prefer']).toBe('return=minimal');
    });

    it('createDeleteHeaders should use return=minimal', () => {
      const headers = createDeleteHeaders(mockAnonKey, mockSession);
      
      expect(headers['Prefer']).toBe('return=minimal');
    });
  });

  describe('PostgRESTPrefer', () => {
    it('should have all constant values', () => {
      expect(PostgRESTPrefer.RETURN_MINIMAL).toBe('return=minimal');
      expect(PostgRESTPrefer.RETURN_HEADERS_ONLY).toBe('return=headers-only');
      expect(PostgRESTPrefer.RETURN_REPRESENTATION).toBe('return=representation');
      expect(PostgRESTPrefer.COUNT_NONE).toBe('count=none');
      expect(PostgRESTPrefer.COUNT_EXACT).toBe('count=exact');
      expect(PostgRESTPrefer.COUNT_PLANNED).toBe('count=planned');
      expect(PostgRESTPrefer.COUNT_ESTIMATED).toBe('count=estimated');
    });

    it('should combine multiple preferences', () => {
      const combined = PostgRESTPrefer.combine(
        PostgRESTPrefer.RETURN_REPRESENTATION,
        PostgRESTPrefer.COUNT_EXACT
      );
      
      expect(combined).toBe('return=representation,count=exact');
    });
  });

  describe('validatePostgRESTHeaders', () => {
    it('should validate headers with apikey', () => {
      const validHeaders = {
        'apikey': mockAnonKey,
      };
      
      expect(validatePostgRESTHeaders(validHeaders)).toBe(true);
    });

    it('should reject headers without apikey', () => {
      const invalidHeaders = {
        'Authorization': 'Bearer token',
      };
      
      expect(validatePostgRESTHeaders(invalidHeaders)).toBe(false);
    });

    it('should validate properly formatted Authorization header', () => {
      const validHeaders = {
        'apikey': mockAnonKey,
        'Authorization': 'Bearer token',
      };
      
      expect(validatePostgRESTHeaders(validHeaders)).toBe(true);
    });

    it('should reject improperly formatted Authorization header', () => {
      const invalidHeaders = {
        'apikey': mockAnonKey,
        'Authorization': 'token-without-bearer',
      };
      
      expect(validatePostgRESTHeaders(invalidHeaders)).toBe(false);
    });
  });

  describe('extractPaginationInfo', () => {
    it('should extract pagination info from Content-Range header', () => {
      const headers = new Headers({
        'Content-Range': '0-9/100',
      });
      
      const info = extractPaginationInfo(headers);
      
      expect(info).toEqual({
        range: { from: 0, to: 9 },
        totalCount: 100,
      });
    });

    it('should handle unknown total count', () => {
      const headers = new Headers({
        'Content-Range': '20-29/*',
      });
      
      const info = extractPaginationInfo(headers);
      
      expect(info).toEqual({
        range: { from: 20, to: 29 },
        totalCount: undefined,
      });
    });

    it('should return empty object when no Content-Range header', () => {
      const headers = new Headers({});
      
      const info = extractPaginationInfo(headers);
      
      expect(info).toEqual({});
    });

    it('should return empty object for invalid Content-Range format', () => {
      const headers = new Headers({
        'Content-Range': 'invalid-format',
      });
      
      const info = extractPaginationInfo(headers);
      
      expect(info).toEqual({});
    });
  });
});