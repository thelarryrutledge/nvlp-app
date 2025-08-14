import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CleanupResult {
  job_name: string
  records_cleaned: number
  execution_time_ms: number
  status: string
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting cleanup jobs...')
    const startTime = Date.now()

    // Check if this is a manual run or scheduled run
    const body = await req.json().catch(() => ({}))
    const isManual = body.manual === true
    const dryRun = body.dry_run === true

    if (dryRun) {
      console.log('Dry run mode - checking what would be cleaned up')
      
      // Get statistics without actually cleaning
      const { data: stats, error: statsError } = await supabaseClient
        .rpc('get_cleanup_stats', { days_back: 7 })

      if (statsError) {
        console.error('Error getting cleanup stats:', statsError)
        throw new Error(`Failed to get cleanup stats: ${statsError.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          message: 'Cleanup statistics (no actual cleanup performed)',
          statistics: stats,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Run all cleanup jobs
    const { data: results, error } = await supabaseClient
      .rpc('run_all_cleanup_jobs')

    if (error) {
      console.error('Cleanup jobs failed:', error)
      throw new Error(`Cleanup failed: ${error.message}`)
    }

    const cleanupResults = results as CleanupResult[]
    const endTime = Date.now()
    const totalDuration = endTime - startTime

    // Calculate summary statistics
    const totalRecordsCleaned = cleanupResults.reduce((sum, result) => sum + result.records_cleaned, 0)
    const successfulJobs = cleanupResults.filter(result => result.status === 'completed').length
    const failedJobs = cleanupResults.filter(result => result.status.startsWith('failed')).length

    console.log(`Cleanup completed in ${totalDuration}ms`)
    console.log(`Total records cleaned: ${totalRecordsCleaned}`)
    console.log(`Successful jobs: ${successfulJobs}, Failed jobs: ${failedJobs}`)

    // Return detailed results
    const response = {
      success: true,
      manual_run: isManual,
      summary: {
        total_records_cleaned: totalRecordsCleaned,
        total_execution_time_ms: totalDuration,
        successful_jobs: successfulJobs,
        failed_jobs: failedJobs,
        timestamp: new Date().toISOString()
      },
      job_results: cleanupResults,
      next_recommended_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Cleanup jobs error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

serve(handler)