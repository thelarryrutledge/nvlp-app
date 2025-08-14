-- Cleanup jobs configuration for session and data management
-- This migration sets up automated cleanup jobs for old sessions and data

-- Enable pg_cron extension (if not already enabled)
-- Note: This requires superuser privileges and may need to be done manually in Supabase dashboard
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enhanced cleanup function for user devices (remove inactive devices)
CREATE OR REPLACE FUNCTION public.cleanup_old_user_devices()
RETURNS TABLE(
  devices_cleaned INTEGER,
  sessions_cleaned INTEGER
) AS $$
DECLARE
  v_devices_cleaned INTEGER := 0;
  v_sessions_cleaned INTEGER := 0;
BEGIN
  -- Clean up devices that haven't been seen in 180 days (6 months)
  -- But keep at least one device per user (the most recent)
  WITH ranked_devices AS (
    SELECT 
      id,
      user_id,
      device_id,
      last_seen,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_seen DESC) as rn
    FROM public.user_devices 
    WHERE last_seen < NOW() - INTERVAL '180 days'
  ),
  devices_to_delete AS (
    SELECT id, user_id, device_id
    FROM ranked_devices 
    WHERE rn > 1  -- Keep at least one device per user
  )
  DELETE FROM public.user_devices 
  WHERE id IN (SELECT id FROM devices_to_delete);
  
  GET DIAGNOSTICS v_devices_cleaned = ROW_COUNT;
  
  -- Clean up invalidated sessions older than 30 days
  DELETE FROM public.invalidated_sessions 
  WHERE invalidated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_sessions_cleaned = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO public.cleanup_logs (
    cleanup_type,
    records_cleaned,
    details,
    created_at
  ) VALUES 
    ('user_devices', v_devices_cleaned, 'Removed inactive devices older than 180 days', NOW()),
    ('invalidated_sessions', v_sessions_cleaned, 'Removed session invalidations older than 30 days', NOW());
  
  RETURN QUERY SELECT v_devices_cleaned, v_sessions_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create cleanup log table to track cleanup activities
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleanup_type TEXT NOT NULL,
  records_cleaned INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on cleanup logs
CREATE INDEX idx_cleanup_logs_created_at ON public.cleanup_logs(created_at);
CREATE INDEX idx_cleanup_logs_type ON public.cleanup_logs(cleanup_type);

-- Enhanced cleanup function for comprehensive maintenance
CREATE OR REPLACE FUNCTION public.run_all_cleanup_jobs()
RETURNS TABLE(
  job_name TEXT,
  records_cleaned INTEGER,
  execution_time_ms INTEGER,
  status TEXT
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_duration INTEGER;
  v_devices_cleaned INTEGER;
  v_sessions_cleaned INTEGER;
  v_transactions_cleaned INTEGER;
BEGIN
  -- Job 1: Cleanup user devices and invalidated sessions
  v_start_time := clock_timestamp();
  
  SELECT * FROM public.cleanup_old_user_devices() 
  INTO v_devices_cleaned, v_sessions_cleaned;
  
  v_end_time := clock_timestamp();
  v_duration := EXTRACT(milliseconds FROM v_end_time - v_start_time)::INTEGER;
  
  RETURN QUERY SELECT 
    'cleanup_user_devices'::TEXT,
    v_devices_cleaned,
    v_duration,
    'completed'::TEXT;
    
  RETURN QUERY SELECT 
    'cleanup_invalidated_sessions'::TEXT,
    v_sessions_cleaned,
    v_duration,
    'completed'::TEXT;
  
  -- Job 2: Cleanup deleted transactions (if function exists)
  v_start_time := clock_timestamp();
  
  BEGIN
    SELECT public.cleanup_deleted_transactions(30) INTO v_transactions_cleaned;
    
    v_end_time := clock_timestamp();
    v_duration := EXTRACT(milliseconds FROM v_end_time - v_start_time)::INTEGER;
    
    RETURN QUERY SELECT 
      'cleanup_deleted_transactions'::TEXT,
      v_transactions_cleaned,
      v_duration,
      'completed'::TEXT;
      
    -- Log transaction cleanup
    INSERT INTO public.cleanup_logs (
      cleanup_type,
      records_cleaned,
      details,
      created_at
    ) VALUES (
      'deleted_transactions',
      v_transactions_cleaned,
      'Removed soft-deleted transactions older than 30 days',
      NOW()
    );
    
  EXCEPTION WHEN OTHERS THEN
    v_end_time := clock_timestamp();
    v_duration := EXTRACT(milliseconds FROM v_end_time - v_start_time)::INTEGER;
    
    RETURN QUERY SELECT 
      'cleanup_deleted_transactions'::TEXT,
      0,
      v_duration,
      'failed: ' || SQLERRM;
  END;
  
  -- Job 3: Cleanup old cleanup logs (keep only last 90 days)
  v_start_time := clock_timestamp();
  
  DELETE FROM public.cleanup_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_transactions_cleaned = ROW_COUNT;
  
  v_end_time := clock_timestamp();
  v_duration := EXTRACT(milliseconds FROM v_end_time - v_start_time)::INTEGER;
  
  RETURN QUERY SELECT 
    'cleanup_old_logs'::TEXT,
    v_transactions_cleaned,
    v_duration,
    'completed'::TEXT;
    
  -- Final summary log
  INSERT INTO public.cleanup_logs (
    cleanup_type,
    records_cleaned,
    details,
    created_at
  ) VALUES (
    'maintenance_summary',
    v_devices_cleaned + v_sessions_cleaned + v_transactions_cleaned,
    'Completed all cleanup jobs',
    NOW()
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cleanup statistics
CREATE OR REPLACE FUNCTION public.get_cleanup_stats(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  cleanup_type TEXT,
  total_records_cleaned BIGINT,
  last_run TIMESTAMPTZ,
  run_count BIGINT
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    cl.cleanup_type,
    SUM(cl.records_cleaned) as total_records_cleaned,
    MAX(cl.created_at) as last_run,
    COUNT(*) as run_count
  FROM public.cleanup_logs cl
  WHERE cl.created_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY cl.cleanup_type
  ORDER BY last_run DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for cleanup_logs
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access cleanup logs
CREATE POLICY "Service role can manage cleanup logs" 
  ON public.cleanup_logs 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.cleanup_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_user_devices() TO service_role;
GRANT EXECUTE ON FUNCTION public.run_all_cleanup_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cleanup_stats(INTEGER) TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION public.cleanup_old_user_devices() IS 
'Cleans up user devices inactive for 180+ days and invalidated sessions older than 30 days';

COMMENT ON FUNCTION public.run_all_cleanup_jobs() IS 
'Runs all cleanup jobs: devices, sessions, transactions, and logs. Returns execution summary.';

COMMENT ON FUNCTION public.get_cleanup_stats(INTEGER) IS 
'Returns cleanup statistics for the specified number of days back (default 30)';

COMMENT ON TABLE public.cleanup_logs IS 
'Logs all cleanup activities for monitoring and auditing purposes';

-- Manual pg_cron job examples (to be configured in Supabase dashboard or via SQL if pg_cron is available):
-- 
-- Daily cleanup at 2 AM UTC:
-- SELECT cron.schedule('nvlp-daily-cleanup', '0 2 * * *', 'SELECT public.run_all_cleanup_jobs();');
--
-- Weekly cleanup on Sundays at 3 AM UTC:
-- SELECT cron.schedule('nvlp-weekly-cleanup', '0 3 * * 0', 'SELECT public.run_all_cleanup_jobs();');
--
-- To list scheduled jobs:
-- SELECT * FROM cron.job;