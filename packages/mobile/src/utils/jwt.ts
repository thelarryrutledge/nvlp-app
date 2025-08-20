/**
 * JWT Utilities
 * 
 * Simple JWT decoding and validation for security checks.
 * Note: This is for validation only, not for cryptographic verification.
 */

export interface JWTPayload {
  sub?: string; // Subject (user ID)
  exp?: number; // Expiration time (seconds since epoch)
  iat?: number; // Issued at (seconds since epoch)
  aud?: string; // Audience
  iss?: string; // Issuer
  [key: string]: any; // Allow other claims
}

/**
 * Decode a JWT token (without verification)
 * This only decodes the payload for inspection, does not verify signature
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format: expected 3 parts');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode base64url to JSON
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    console.warn('JWT missing expiration claim');
    return true; // Treat as expired if no exp claim
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const isExpired = now >= payload.exp;
  
  if (isExpired) {
    console.log('🔐 JWT expired:', {
      currentTime: new Date(now * 1000).toISOString(),
      expirationTime: new Date(payload.exp * 1000).toISOString(),
      expiredBy: now - payload.exp + ' seconds'
    });
  }
  
  return isExpired;
}

/**
 * Get JWT expiration time as Date object
 */
export function getJWTExpiration(token: string): Date | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }
  
  return new Date(payload.exp * 1000);
}

/**
 * Get time until JWT expires (in milliseconds)
 */
export function getJWTTimeUntilExpiration(token: string): number | null {
  const expiration = getJWTExpiration(token);
  if (!expiration) {
    return null;
  }
  
  return expiration.getTime() - Date.now();
}

/**
 * Validate JWT token for basic security checks
 */
export function validateJWTForSecurity(token: string): { 
  isValid: boolean; 
  reason?: string; 
  payload?: JWTPayload 
} {
  // Check if token is expired
  if (isJWTExpired(token)) {
    return {
      isValid: false,
      reason: 'Token is expired'
    };
  }
  
  const payload = decodeJWT(token);
  if (!payload) {
    return {
      isValid: false,
      reason: 'Invalid token format'
    };
  }
  
  // Check if token was issued in the future (clock skew protection)
  if (payload.iat) {
    const now = Math.floor(Date.now() / 1000);
    if (payload.iat > now + 60) { // Allow 1 minute clock skew
      return {
        isValid: false,
        reason: 'Token issued in the future'
      };
    }
  }
  
  return {
    isValid: true,
    payload
  };
}