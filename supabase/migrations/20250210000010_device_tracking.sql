-- Device tracking and session management for enhanced security

-- Table to track user devices
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL, -- App-generated unique ID (UUID + install time)
  device_fingerprint TEXT NOT NULL, -- Model + OS version + other identifiers
  device_name TEXT, -- "iPhone 15 Pro" or user-customized name
  device_type TEXT CHECK (device_type IN ('ios', 'android')) NOT NULL,
  device_model TEXT, -- "iPhone15,3", "SM-G998B"
  os_version TEXT, -- "17.1.2", "14"
  app_version TEXT, -- "1.0.0"
  first_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address INET,
  location_country TEXT,
  location_city TEXT,
  is_current BOOLEAN DEFAULT FALSE NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
  push_token TEXT, -- For remote notifications
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_user_device UNIQUE(user_id, device_id)
);

-- Table to track invalidated sessions for "sign out all devices" functionality
CREATE TABLE IF NOT EXISTS public.invalidated_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT, -- NULL means invalidate all devices for user
  invalidated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reason TEXT NOT NULL DEFAULT 'user_signout',
  invalidated_by_device_id TEXT, -- Which device initiated the sign-out
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_device_id ON public.user_devices(device_id);
CREATE INDEX idx_user_devices_last_seen ON public.user_devices(last_seen);
CREATE INDEX idx_user_devices_is_current ON public.user_devices(user_id, is_current) WHERE is_current = true;

CREATE INDEX idx_invalidated_sessions_user_id ON public.invalidated_sessions(user_id);
CREATE INDEX idx_invalidated_sessions_device_id ON public.invalidated_sessions(device_id);
CREATE INDEX idx_invalidated_sessions_invalidated_at ON public.invalidated_sessions(invalidated_at);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invalidated_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_devices
CREATE POLICY "Users can view their own devices" 
  ON public.user_devices 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own devices" 
  ON public.user_devices 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices" 
  ON public.user_devices 
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own devices" 
  ON public.user_devices 
  FOR DELETE 
  USING (user_id = auth.uid());

-- RLS policies for invalidated_sessions  
CREATE POLICY "Users can view their own invalidated sessions" 
  ON public.invalidated_sessions 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create invalidated sessions for themselves" 
  ON public.invalidated_sessions 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Function to check if a session is invalidated
CREATE OR REPLACE FUNCTION public.is_session_invalidated(
  p_user_id UUID,
  p_device_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_invalidated BOOLEAN := FALSE;
BEGIN
  -- Check if there's a specific device invalidation
  IF p_device_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.invalidated_sessions 
      WHERE user_id = p_user_id 
        AND (device_id = p_device_id OR device_id IS NULL)
        AND invalidated_at > (NOW() - INTERVAL '7 days') -- Only check recent invalidations
    ) INTO v_invalidated;
  ELSE
    -- Check for user-wide invalidation
    SELECT EXISTS(
      SELECT 1 FROM public.invalidated_sessions 
      WHERE user_id = p_user_id 
        AND device_id IS NULL
        AND invalidated_at > (NOW() - INTERVAL '7 days')
    ) INTO v_invalidated;
  END IF;
  
  RETURN v_invalidated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invalidate sessions
CREATE OR REPLACE FUNCTION public.invalidate_sessions(
  p_user_id UUID,
  p_device_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'user_signout',
  p_initiated_by_device TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.invalidated_sessions (
    user_id, 
    device_id, 
    reason, 
    invalidated_by_device_id
  ) VALUES (
    p_user_id, 
    p_device_id, 
    p_reason, 
    p_initiated_by_device
  );
  
  -- If invalidating all devices, mark all as not current
  IF p_device_id IS NULL THEN
    UPDATE public.user_devices 
    SET is_current = FALSE,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Mark specific device as not current
    UPDATE public.user_devices 
    SET is_current = FALSE,
        updated_at = NOW()
    WHERE user_id = p_user_id AND device_id = p_device_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register/update device
CREATE OR REPLACE FUNCTION public.register_device(
  p_device_id TEXT,
  p_device_fingerprint TEXT,
  p_device_name TEXT,
  p_device_type TEXT,
  p_device_model TEXT DEFAULT NULL,
  p_os_version TEXT DEFAULT NULL,
  p_app_version TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_location_country TEXT DEFAULT NULL,
  p_location_city TEXT DEFAULT NULL,
  p_push_token TEXT DEFAULT NULL
) RETURNS TABLE(is_new_device BOOLEAN, device_record JSONB) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_new BOOLEAN := FALSE;
  v_device_record public.user_devices;
BEGIN
  -- Check if device exists
  SELECT * INTO v_device_record
  FROM public.user_devices 
  WHERE user_id = v_user_id AND device_id = p_device_id;
  
  IF NOT FOUND THEN
    -- New device - insert
    v_is_new := TRUE;
    
    -- Mark all other devices as not current
    UPDATE public.user_devices 
    SET is_current = FALSE,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- Insert new device
    INSERT INTO public.user_devices (
      user_id, device_id, device_fingerprint, device_name,
      device_type, device_model, os_version, app_version,
      ip_address, location_country, location_city, 
      is_current, push_token
    ) VALUES (
      v_user_id, p_device_id, p_device_fingerprint, p_device_name,
      p_device_type, p_device_model, p_os_version, p_app_version,
      p_ip_address, p_location_country, p_location_city,
      TRUE, p_push_token
    ) RETURNING * INTO v_device_record;
    
  ELSE
    -- Existing device - update
    UPDATE public.user_devices SET
      last_seen = NOW(),
      is_current = TRUE,
      ip_address = COALESCE(p_ip_address, ip_address),
      location_country = COALESCE(p_location_country, location_country),
      location_city = COALESCE(p_location_city, location_city),
      push_token = COALESCE(p_push_token, push_token),
      app_version = COALESCE(p_app_version, app_version),
      updated_at = NOW()
    WHERE user_id = v_user_id AND device_id = p_device_id
    RETURNING * INTO v_device_record;
    
    -- Mark other devices as not current
    UPDATE public.user_devices 
    SET is_current = FALSE,
        updated_at = NOW()
    WHERE user_id = v_user_id AND device_id != p_device_id;
  END IF;
  
  RETURN QUERY SELECT 
    v_is_new,
    row_to_json(v_device_record)::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE TRIGGER update_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Clean up old invalidated sessions (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_invalidated_sessions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.invalidated_sessions 
  WHERE invalidated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;