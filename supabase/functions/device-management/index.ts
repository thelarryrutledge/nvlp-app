import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { withSecurity } from '../_shared/security-headers.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'

const handler = async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const deviceId = req.headers.get('X-Device-ID')

    // Create Supabase client with the user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Get the current user from the JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(part => part !== '')
    
    // Remove 'device-management' from path parts
    const routePath = pathParts.slice(1).join('/')

    // Route handling
    switch (req.method) {
      case 'POST':
        if (routePath === 'register') {
          return await handleRegisterDevice(supabaseClient, user.id, await req.json(), req)
        } else if (routePath === 'signout-all') {
          return await handleSignOutAllDevices(supabaseClient, user.id, deviceId)
        } else if (routePath === 'send-notification') {
          return await handleSendNotification(supabaseClient, user.id, await req.json())
        }
        break
      
      case 'GET':
        if (routePath === 'list') {
          return await handleListDevices(supabaseClient, user.id, deviceId)
        } else if (routePath === 'current') {
          return await handleGetCurrentDevice(supabaseClient, user.id, deviceId)
        }
        break
      
      case 'PATCH':
        if (routePath === 'current') {
          return await handleUpdateCurrentDevice(supabaseClient, user.id, deviceId, await req.json())
        } else if (routePath.startsWith('revoke/')) {
          const targetDeviceId = routePath.replace('revoke/', '')
          return await handleRevokeDevice(supabaseClient, user.id, targetDeviceId)
        }
        break
      
      case 'DELETE':
        // DELETE /:deviceId - Sign out specific device
        if (routePath) {
          return await handleSignOutDevice(supabaseClient, user.id, routePath)
        }
        break
    }

    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handler functions

async function handleRegisterDevice(
  supabaseClient: any,
  userId: string,
  body: any,
  request: Request
) {
  const {
    device_id,
    device_fingerprint,
    device_name,
    device_type,
    device_model,
    os_version,
    app_version,
    push_token
  } = body

  if (!device_id || !device_fingerprint || !device_name || !device_type) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Get IP address and location info (simplified for now)
  const ip_address = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                    'unknown'

  // Call the register_device database function
  const { data, error } = await supabaseClient.rpc('register_device', {
    p_device_id: device_id,
    p_device_fingerprint: device_fingerprint,
    p_device_name: device_name,
    p_device_type: device_type,
    p_device_model: device_model,
    p_os_version: os_version,
    p_app_version: app_version,
    p_push_token: push_token,
    p_ip_address: ip_address
  })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Check if this is a new device
  const is_new_device = data?.is_new_device || false
  
  // Get the registered device details
  const { data: device, error: deviceError } = await supabaseClient
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('device_id', device_id)
    .single()

  if (deviceError) {
    return new Response(
      JSON.stringify({ error: deviceError.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // If it's a new device, trigger email notification
  let requires_notification = false
  if (is_new_device) {
    // Check if user has other devices (not their first device)
    const { count } = await supabaseClient
      .from('user_devices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('device_id', device_id)

    requires_notification = count > 0
    
    if (requires_notification) {
      // Trigger notification (we'll call the send-device-notification function)
      await sendNewDeviceNotification(supabaseClient, userId, device)
    }
  }

  return new Response(
    JSON.stringify({
      is_new_device,
      device,
      requires_notification
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleListDevices(
  supabaseClient: any,
  userId: string,
  currentDeviceId: string | null
) {
  const { data: devices, error } = await supabaseClient
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .order('last_seen', { ascending: false })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Mark the current device
  const devicesWithCurrent = devices.map((device: any) => ({
    ...device,
    is_current: device.device_id === currentDeviceId
  }))

  return new Response(
    JSON.stringify({ devices: devicesWithCurrent }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleGetCurrentDevice(
  supabaseClient: any,
  userId: string,
  deviceId: string | null
) {
  if (!deviceId) {
    return new Response(
      JSON.stringify({ error: 'Device ID header required' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  const { data: device, error } = await supabaseClient
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .single()

  if (error || !device) {
    return new Response(
      JSON.stringify({ error: 'Device not found' }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ device: { ...device, is_current: true } }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleUpdateCurrentDevice(
  supabaseClient: any,
  userId: string,
  deviceId: string | null,
  updates: any
) {
  if (!deviceId) {
    return new Response(
      JSON.stringify({ error: 'Device ID header required' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Only allow updating certain fields
  const allowedUpdates: any = {}
  const allowedFields = ['device_name', 'push_token', 'app_version']
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      allowedUpdates[field] = updates[field]
    }
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return new Response(
      JSON.stringify({ error: 'No valid fields to update' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  const { data: device, error } = await supabaseClient
    .from('user_devices')
    .update(allowedUpdates)
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .select()
    .single()

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ device }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleSignOutDevice(
  supabaseClient: any,
  userId: string,
  targetDeviceId: string
) {
  // Invalidate sessions for this device
  const { error } = await supabaseClient.rpc('invalidate_sessions', {
    p_user_id: userId,
    p_device_id: targetDeviceId
  })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Device signed out' }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleSignOutAllDevices(
  supabaseClient: any,
  userId: string,
  currentDeviceId: string | null
) {
  // Get all devices except current
  const { data: devices, error: devicesError } = await supabaseClient
    .from('user_devices')
    .select('device_id')
    .eq('user_id', userId)
    .neq('device_id', currentDeviceId)

  if (devicesError) {
    return new Response(
      JSON.stringify({ error: devicesError.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Invalidate sessions for all other devices
  for (const device of devices) {
    await supabaseClient.rpc('invalidate_sessions', {
      p_user_id: userId,
      p_device_id: device.device_id
    })
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Signed out ${devices.length} other device(s)` 
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleRevokeDevice(
  supabaseClient: any,
  userId: string,
  targetDeviceId: string
) {
  // First invalidate sessions
  await supabaseClient.rpc('invalidate_sessions', {
    p_user_id: userId,
    p_device_id: targetDeviceId
  })

  // Then mark device as revoked
  const { error } = await supabaseClient
    .from('user_devices')
    .update({ is_revoked: true })
    .eq('user_id', userId)
    .eq('device_id', targetDeviceId)

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Device revoked' }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function handleSendNotification(
  supabaseClient: any,
  userId: string,
  body: any
) {
  const { device_id } = body

  if (!device_id) {
    return new Response(
      JSON.stringify({ error: 'Device ID required' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Get device details
  const { data: device, error } = await supabaseClient
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('device_id', device_id)
    .single()

  if (error || !device) {
    return new Response(
      JSON.stringify({ error: 'Device not found' }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  // Send notification
  await sendNewDeviceNotification(supabaseClient, userId, device)

  return new Response(
    JSON.stringify({ success: true, message: 'Notification sent' }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

async function sendNewDeviceNotification(
  _supabaseClient: any,
  userId: string,
  device: any
) {
  // Use service role client for admin operations
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Get user details
  const { data: { user } } = await serviceClient.auth.admin.getUserById(userId)
  
  if (!user?.email) {
    console.log('User email not found, skipping notification')
    return
  }

  // Call the send-device-notification Edge Function
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-device-notification`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: user.email,
        device_name: device.device_name,
        device_type: device.device_type,
        location: `${device.location_city || 'Unknown'}, ${device.location_country || 'Unknown'}`,
        signin_time: new Date(device.first_seen).toLocaleString(),
        ip_address: device.ip_address || 'Unknown'
      })
    }
  )

  if (!response.ok) {
    console.error('Failed to send device notification:', await response.text())
  }
}

// Apply security headers and rate limiting to the handler
serve(withSecurity(withRateLimit('api', handler)))