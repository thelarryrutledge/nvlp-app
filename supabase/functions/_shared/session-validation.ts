import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const sessionValidationMiddleware = async (
  supabaseClient: any,
  headers: Record<string, string>
): Promise<{ isValid: boolean; error?: string; code?: string; userId?: string }> => {
  const deviceId = headers['x-device-id']
  
  if (!deviceId) {
    return { isValid: false, error: 'Device ID required' }
  }
  
  // Use Supabase's built-in JWT verification (handles asymmetric keys automatically)
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
  if (userError || !user) {
    return { isValid: false, error: 'Invalid authentication' }
  }
  
  // Check session invalidation using database function
  const { data: isInvalidated, error } = await supabaseClient.rpc(
    'is_session_invalidated',
    { p_user_id: user.id, p_device_id: deviceId }
  )
  
  if (error) {
    console.error('Session validation error:', error)
    return { isValid: false, error: 'Session validation failed' }
  }
  
  if (isInvalidated) {
    return { isValid: false, error: 'Session invalidated', code: 'SESSION_INVALIDATED' }
  }
  
  return { isValid: true, userId: user.id }
}