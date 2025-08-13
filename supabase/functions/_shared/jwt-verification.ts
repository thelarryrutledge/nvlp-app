import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface JWTPayload {
  sub: string // user ID
  email?: string
  role?: string
  iat: number
  exp: number
  iss: string
  aud: string
}

/**
 * Verify Supabase JWT using the recommended getClaims() method
 */
export async function verifySupabaseJWT(token: string): Promise<JWTPayload> {
  try {
    console.log('Verifying JWT using supabase.auth.getClaims()')
    
    // Create a temporary Supabase client to use getClaims
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Use the new getClaims method which handles asymmetric verification
    const { data: claims, error } = await supabase.auth.getClaims(token)
    
    if (error || !claims) {
      throw new Error(`Token verification failed: ${error?.message || 'No claims returned'}`)
    }
    
    if (!claims.sub) {
      throw new Error('Invalid token: missing user ID')
    }
    
    console.log('JWT verification successful for user:', claims.sub)
    return claims as JWTPayload
  } catch (error) {
    console.error('JWT verification failed:', error)
    throw new Error(`Invalid or expired token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract and verify JWT from Authorization header
 */
export async function extractAndVerifyJWT(authHeader: string | null): Promise<JWTPayload> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }
  
  const token = authHeader.substring(7)
  return await verifySupabaseJWT(token)
}

/**
 * Get user ID from request headers (with JWT verification)
 */
export async function getUserIdFromHeaders(headers: Headers): Promise<string> {
  const authHeader = headers.get('authorization')
  const payload = await extractAndVerifyJWT(authHeader)
  return payload.sub
}