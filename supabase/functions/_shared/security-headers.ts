/**
 * Security Headers Middleware for NVLP API
 * 
 * Adds security headers to prevent common attacks:
 * - XSS attacks
 * - Clickjacking
 * - MIME type sniffing
 * - Content type attacks
 * - Information leakage
 */

export interface SecurityHeadersOptions {
  contentSecurityPolicy?: string;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  contentTypeOptions?: boolean;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  hsts?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
}

const DEFAULT_OPTIONS: SecurityHeadersOptions = {
  contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; child-src 'none'; worker-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';",
  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
};

/**
 * Create security headers object
 */
export function createSecurityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const headers: Record<string, string> = {};

  // Content Security Policy
  if (config.contentSecurityPolicy) {
    headers['Content-Security-Policy'] = config.contentSecurityPolicy;
  }

  // X-Frame-Options (Clickjacking protection)
  if (config.frameOptions) {
    headers['X-Frame-Options'] = config.frameOptions;
  }

  // X-Content-Type-Options (MIME type sniffing protection)
  if (config.contentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Referrer Policy
  if (config.referrerPolicy) {
    headers['Referrer-Policy'] = config.referrerPolicy;
  }

  // Permissions Policy
  if (config.permissionsPolicy) {
    headers['Permissions-Policy'] = config.permissionsPolicy;
  }

  // HTTP Strict Transport Security (HTTPS enforcement)
  if (config.hsts) {
    const { maxAge, includeSubDomains, preload } = config.hsts;
    let hstsValue = `max-age=${maxAge}`;
    if (includeSubDomains) hstsValue += '; includeSubDomains';
    if (preload) hstsValue += '; preload';
    headers['Strict-Transport-Security'] = hstsValue;
  }

  // Additional security headers
  headers['X-XSS-Protection'] = '1; mode=block';
  headers['X-Robots-Tag'] = 'noindex, nofollow';
  headers['X-Powered-By'] = ''; // Remove server signature

  return headers;
}

/**
 * Security headers middleware for Edge Functions
 */
export function withSecurityHeaders(
  handler: (req: Request) => Promise<Response>,
  options: SecurityHeadersOptions = {}
) {
  return async (req: Request): Promise<Response> => {
    const response = await handler(req);
    
    // Don't add security headers to CORS preflight responses
    if (req.method === 'OPTIONS') {
      return response;
    }
    
    const securityHeaders = createSecurityHeaders(options);
    
    // Create new response with security headers
    const headers = new Headers(response.headers);
    
    Object.entries(securityHeaders).forEach(([key, value]) => {
      if (value) {
        headers.set(key, value);
      }
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * API-specific security headers configuration
 */
export const API_SECURITY_HEADERS: SecurityHeadersOptions = {
  contentSecurityPolicy: "default-src 'none'; script-src 'none'; style-src 'none'; img-src 'none'; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; child-src 'none'; worker-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none';",
  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'no-referrer',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), autoplay=(), encrypted-media=(), fullscreen=(), picture-in-picture=()',
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};

/**
 * Validate request headers for security
 */
export function validateRequestHeaders(req: Request): string[] {
  const warnings: string[] = [];
  
  // Check for potentially dangerous headers
  const dangerousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url',
  ];
  
  dangerousHeaders.forEach(header => {
    if (req.headers.get(header)) {
      warnings.push(`Potentially dangerous header detected: ${header}`);
    }
  });
  
  // Check for host header injection
  const host = req.headers.get('host');
  if (host && (host.includes('..') || host.includes('//') || host.includes('\\'))) {
    warnings.push('Potential host header injection detected');
  }
  
  // Check for excessively long headers (potential DoS)
  req.headers.forEach((value, key) => {
    if (value.length > 8192) {
      warnings.push(`Excessively long header detected: ${key}`);
    }
  });
  
  // Check user agent for known malicious patterns
  const userAgent = req.headers.get('user-agent');
  if (userAgent) {
    const maliciousPatterns = [
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /burp/i,
      /wget/i,
      /curl.*bot/i,
    ];
    
    if (maliciousPatterns.some(pattern => pattern.test(userAgent))) {
      warnings.push('Potentially malicious user agent detected');
    }
  }
  
  return warnings;
}

/**
 * Create security violation response
 */
export function createSecurityViolationResponse(
  violations: string[],
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Security policy violation',
      message: 'Request violates security policies',
      violations,
    }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        ...createSecurityHeaders(API_SECURITY_HEADERS),
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Security validation middleware
 */
export function withSecurityValidation(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    // Skip validation for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return handler(req);
    }
    
    const violations = validateRequestHeaders(req);
    
    if (violations.length > 0) {
      const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
      return createSecurityViolationResponse(violations, corsHeaders);
    }
    
    return handler(req);
  };
}

/**
 * Combined security middleware (headers + validation)
 */
export function withSecurity(
  handler: (req: Request) => Promise<Response>,
  options: SecurityHeadersOptions = API_SECURITY_HEADERS
) {
  return withSecurityHeaders(
    withSecurityValidation(handler),
    options
  );
}