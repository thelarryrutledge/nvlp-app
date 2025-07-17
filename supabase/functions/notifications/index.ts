import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
}

// Helper function for consistent error responses
function createErrorResponse(error: string, code: string, status: number = 400, details?: any) {
  const errorObj: any = { error, code }
  if (details) errorObj.details = details
  
  console.error(`[NOTIFICATIONS ERROR] ${code}: ${error}`, details ? details : '')
  
  return new Response(
    JSON.stringify(errorObj),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        ...securityHeaders,
        'Content-Type': 'application/json' 
      } 
    }
  )
}

// Helper function for consistent success responses
function createSuccessResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        ...securityHeaders,
        'Content-Type': 'application/json' 
      } 
    }
  )
}

// Helper function to validate JWT token and get user
async function validateTokenAndGetUser(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw { error: 'Invalid or expired token', code: 'INVALID_TOKEN', status: 401 }
  }

  return user
}

// Helper function to get today's date in user's timezone (or UTC if not specified)
function getTodayDate(timezone?: string): string {
  const today = new Date()
  
  if (timezone) {
    try {
      return today.toLocaleDateString('en-CA', { timeZone: timezone }) // Returns YYYY-MM-DD format
    } catch (error) {
      console.warn(`Invalid timezone ${timezone}, using UTC`)
    }
  }
  
  return today.toISOString().split('T')[0] // UTC date in YYYY-MM-DD format
}

// Notification query functions
const NotificationQueries = {
  // Get income source notifications
  async getIncomeSourceNotifications(supabase: any, budgetIds: string[], today: string, acknowledgedNotifications: Set<string>) {
    const notifications: any[] = []
    
    // Income sources due today
    const { data: dueSources, error: dueError } = await supabase
      .from('income_sources')
      .select(`
        id,
        name,
        expected_monthly_amount,
        frequency,
        next_expected_date,
        budget_id,
        budgets!inner(name)
      `)
      .in('budget_id', budgetIds)
      .eq('should_notify', true)
      .eq('next_expected_date', today)
      .eq('is_active', true)

    if (dueError) throw dueError

    dueSources?.forEach(source => {
      const notificationKey = `income_source_due_${source.id}_${today}`
      if (!acknowledgedNotifications.has(notificationKey)) {
        notifications.push({
          id: `income_source_due_${source.id}_${today}`,
          type: 'income_source_due',
          priority: 'medium',
          title: 'Income Due Today',
          message: `${source.name} ($${source.expected_monthly_amount || 'amount TBD'}) is expected today`,
          budget_id: source.budget_id,
          budget_name: source.budgets.name,
          related_entity_type: 'income_source',
          related_entity_id: source.id,
          notification_date: today,
          metadata: {
            income_source_name: source.name,
            amount: source.expected_monthly_amount,
            frequency: source.frequency
          }
        })
      }
    })

    // Overdue income sources (past due)
    const { data: overdueSources, error: overdueError } = await supabase
      .from('income_sources')
      .select(`
        id,
        name,
        expected_monthly_amount,
        frequency,
        next_expected_date,
        budget_id,
        budgets!inner(name)
      `)
      .in('budget_id', budgetIds)
      .eq('should_notify', true)
      .lt('next_expected_date', today)
      .eq('is_active', true)

    if (overdueError) throw overdueError

    overdueSources?.forEach(source => {
      const notificationKey = `income_source_overdue_${source.id}_${today}`
      if (!acknowledgedNotifications.has(notificationKey)) {
        const daysPastDue = Math.floor((new Date(today).getTime() - new Date(source.next_expected_date).getTime()) / (1000 * 60 * 60 * 24))
        notifications.push({
          id: `income_source_overdue_${source.id}_${today}`,
          type: 'income_source_overdue',
          priority: 'high',
          title: 'Income Overdue',
          message: `${source.name} ($${source.expected_monthly_amount || 'amount TBD'}) was due ${daysPastDue} day${daysPastDue > 1 ? 's' : ''} ago`,
          budget_id: source.budget_id,
          budget_name: source.budgets.name,
          related_entity_type: 'income_source',
          related_entity_id: source.id,
          notification_date: today,
          metadata: {
            income_source_name: source.name,
            amount: source.expected_monthly_amount,
            due_date: source.next_expected_date,
            days_overdue: daysPastDue
          }
        })
      }
    })

    return notifications
  },

  // Get envelope notifications
  async getEnvelopeNotifications(supabase: any, budgetIds: string[], today: string, acknowledgedNotifications: Set<string>) {
    const notifications: any[] = []

    // Envelope date notifications
    const { data: dateDueEnvelopes, error: dateError } = await supabase
      .from('envelopes')
      .select(`
        id,
        name,
        notify_date,
        current_balance,
        notify_above_amount,
        budget_id,
        budgets!inner(name),
        categories(name)
      `)
      .in('budget_id', budgetIds)
      .eq('should_notify', true)
      .eq('notify_date', today)
      .eq('is_active', true)

    if (dateError) throw dateError

    dateDueEnvelopes?.forEach(envelope => {
      const notificationKey = `envelope_date_due_${envelope.id}_${today}`
      if (!acknowledgedNotifications.has(notificationKey)) {
        notifications.push({
          id: `envelope_date_due_${envelope.id}_${today}`,
          type: 'envelope_date_due',
          priority: 'medium',
          title: 'Envelope Date Reminder',
          message: `${envelope.name} date reminder is today`,
          budget_id: envelope.budget_id,
          budget_name: envelope.budgets.name,
          related_entity_type: 'envelope',
          related_entity_id: envelope.id,
          notification_date: today,
          metadata: {
            envelope_name: envelope.name,
            current_balance: envelope.current_balance,
            notify_above_amount: envelope.notify_above_amount,
            category_name: envelope.categories?.name
          }
        })
      }
    })

    // Envelope amount threshold notifications
    const { data: amountEnvelopes, error: amountError } = await supabase
      .from('envelopes')
      .select(`
        id,
        name,
        notify_below_amount,
        current_balance,
        notify_above_amount,
        budget_id,
        budgets!inner(name),
        categories(name)
      `)
      .in('budget_id', budgetIds)
      .eq('should_notify', true)
      .not('notify_below_amount', 'is', null)
      .eq('is_active', true)

    if (amountError) throw amountError

    amountEnvelopes?.forEach(envelope => {
      // Check if current balance has fallen below the notify threshold
      if (envelope.current_balance <= envelope.notify_below_amount) {
        const notificationKey = `envelope_amount_threshold_${envelope.id}_${today}`
        if (!acknowledgedNotifications.has(notificationKey)) {
          notifications.push({
            id: `envelope_amount_threshold_${envelope.id}_${today}`,
            type: 'envelope_amount_threshold',
            priority: 'low',
            title: 'Envelope Below Threshold',
            message: `${envelope.name} has fallen below $${envelope.notify_below_amount} (currently $${envelope.current_balance})`,
            budget_id: envelope.budget_id,
            budget_name: envelope.budgets.name,
            related_entity_type: 'envelope',
            related_entity_id: envelope.id,
            notification_date: today,
            metadata: {
              envelope_name: envelope.name,
              current_balance: envelope.current_balance,
              notify_below_amount: envelope.notify_below_amount,
              notify_above_amount: envelope.notify_above_amount,
              category_name: envelope.categories?.name
            }
          })
        }
      }
    })

    // Overbudget envelopes (negative balance)
    const { data: overbudgetEnvelopes, error: overbudgetError } = await supabase
      .from('envelopes')
      .select(`
        id,
        name,
        current_balance,
        notify_above_amount,
        budget_id,
        budgets!inner(name),
        categories(name)
      `)
      .in('budget_id', budgetIds)
      .lt('current_balance', 0)
      .eq('is_active', true)

    if (overbudgetError) throw overbudgetError

    overbudgetEnvelopes?.forEach(envelope => {
      const notificationKey = `envelope_overbudget_${envelope.id}_${today}`
      if (!acknowledgedNotifications.has(notificationKey)) {
        notifications.push({
          id: `envelope_overbudget_${envelope.id}_${today}`,
          type: 'envelope_overbudget',
          priority: 'high',
          title: 'Envelope Over Budget',
          message: `${envelope.name} is over budget by $${Math.abs(envelope.current_balance)}`,
          budget_id: envelope.budget_id,
          budget_name: envelope.budgets.name,
          related_entity_type: 'envelope',
          related_entity_id: envelope.id,
          notification_date: today,
          metadata: {
            envelope_name: envelope.name,
            current_balance: envelope.current_balance,
            notify_above_amount: envelope.notify_above_amount,
            over_amount: Math.abs(envelope.current_balance),
            category_name: envelope.categories?.name
          }
        })
      }
    })

    return notifications
  },

  // Get transaction notifications (uncleared old transactions)
  async getTransactionNotifications(supabase: any, budgetIds: string[], today: string, acknowledgedNotifications: Set<string>) {
    const notifications: any[] = []
    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() - 7) // 7 days ago
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    const { data: unclearedTransactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_type,
        amount,
        description,
        transaction_date,
        budget_id,
        budgets!inner(name),
        payees(name),
        envelopes!from_envelope_id(name)
      `)
      .in('budget_id', budgetIds)
      .eq('is_cleared', false)
      .lte('transaction_date', cutoffDateStr)
      .eq('is_deleted', false)

    if (error) throw error

    unclearedTransactions?.forEach(transaction => {
      const notificationKey = `transaction_uncleared_${transaction.id}_${today}`
      if (!acknowledgedNotifications.has(notificationKey)) {
        const daysOld = Math.floor((new Date(today).getTime() - new Date(transaction.transaction_date).getTime()) / (1000 * 60 * 60 * 24))
        notifications.push({
          id: `transaction_uncleared_${transaction.id}_${today}`,
          type: 'transaction_uncleared',
          priority: 'low',
          title: 'Old Uncleared Transaction',
          message: `${transaction.description} ($${transaction.amount}) from ${daysOld} days ago is still uncleared`,
          budget_id: transaction.budget_id,
          budget_name: transaction.budgets.name,
          related_entity_type: 'transaction',
          related_entity_id: transaction.id,
          notification_date: today,
          metadata: {
            transaction_type: transaction.transaction_type,
            amount: transaction.amount,
            description: transaction.description,
            transaction_date: transaction.transaction_date,
            days_old: daysOld,
            payee_name: transaction.payees?.name,
            envelope_name: transaction.envelopes?.name
          }
        })
      }
    })

    return notifications
  },

  // Get acknowledged notifications for filtering
  async getAcknowledgedNotifications(supabase: any, userId: string, budgetIds: string[], today: string) {
    const { data, error } = await supabase
      .from('notification_acknowledgments')
      .select('notification_type, related_entity_id, notification_date')
      .eq('user_id', userId)
      .in('budget_id', budgetIds)
      .eq('notification_date', today)
      .eq('is_dismissed', false)

    if (error) throw error

    const acknowledgedSet = new Set<string>()
    data?.forEach(ack => {
      const key = `${ack.notification_type}_${ack.related_entity_id}_${ack.notification_date}`
      acknowledgedSet.add(key)
    })

    return acknowledgedSet
  },

  // Acknowledge notifications
  async acknowledgeNotifications(supabase: any, userId: string, notificationIds: string[]) {
    const acknowledgments: any[] = []

    for (const notificationId of notificationIds) {
      // Parse notification ID to extract components
      const parts = notificationId.split('_')
      if (parts.length < 4) continue

      // Extract notification type properly
      let notificationType = ''
      let entityId = ''
      let notificationDate = ''
      
      if (notificationId.startsWith('income_source_due_')) {
        notificationType = 'income_source_due'
        const remaining = notificationId.substring('income_source_due_'.length)
        const lastUnderscore = remaining.lastIndexOf('_')
        entityId = remaining.substring(0, lastUnderscore)
        notificationDate = remaining.substring(lastUnderscore + 1)
      } else if (notificationId.startsWith('income_source_overdue_')) {
        notificationType = 'income_source_overdue'
        const remaining = notificationId.substring('income_source_overdue_'.length)
        const lastUnderscore = remaining.lastIndexOf('_')
        entityId = remaining.substring(0, lastUnderscore)
        notificationDate = remaining.substring(lastUnderscore + 1)
      } else if (notificationId.startsWith('envelope_date_due_')) {
        notificationType = 'envelope_date_due'
        const remaining = notificationId.substring('envelope_date_due_'.length)
        const lastUnderscore = remaining.lastIndexOf('_')
        entityId = remaining.substring(0, lastUnderscore)
        notificationDate = remaining.substring(lastUnderscore + 1)
      } else if (notificationId.startsWith('envelope_amount_threshold_')) {
        notificationType = 'envelope_amount_threshold'
        const remaining = notificationId.substring('envelope_amount_threshold_'.length)
        const lastUnderscore = remaining.lastIndexOf('_')
        entityId = remaining.substring(0, lastUnderscore)
        notificationDate = remaining.substring(lastUnderscore + 1)
      } else if (notificationId.startsWith('envelope_overbudget_')) {
        notificationType = 'envelope_overbudget'
        const remaining = notificationId.substring('envelope_overbudget_'.length)
        const lastUnderscore = remaining.lastIndexOf('_')
        entityId = remaining.substring(0, lastUnderscore)
        notificationDate = remaining.substring(lastUnderscore + 1)
      } else if (notificationId.startsWith('transaction_uncleared_')) {
        notificationType = 'transaction_uncleared'
        const remaining = notificationId.substring('transaction_uncleared_'.length)
        const lastUnderscore = remaining.lastIndexOf('_')
        entityId = remaining.substring(0, lastUnderscore)
        notificationDate = remaining.substring(lastUnderscore + 1)
      } else {
        continue // Skip unknown notification types
      }

      // Determine entity type from notification type
      let entityType = 'envelope'
      if (notificationType.startsWith('income_source')) {
        entityType = 'income_source'
      } else if (notificationType.startsWith('transaction')) {
        entityType = 'transaction'
      }

      // Get budget_id for this entity
      let budgetId = null
      if (entityType === 'income_source') {
        const { data } = await supabase
          .from('income_sources')
          .select('budget_id')
          .eq('id', entityId)
          .single()
        budgetId = data?.budget_id
      } else if (entityType === 'envelope') {
        const { data } = await supabase
          .from('envelopes')
          .select('budget_id')
          .eq('id', entityId)
          .single()
        budgetId = data?.budget_id
      } else if (entityType === 'transaction') {
        const { data } = await supabase
          .from('transactions')
          .select('budget_id')
          .eq('id', entityId)
          .single()
        budgetId = data?.budget_id
      }

      if (budgetId) {
        acknowledgments.push({
          user_id: userId,
          budget_id: budgetId,
          notification_type: notificationType,
          related_entity_id: entityId,
          related_entity_type: entityType,
          notification_date: notificationDate
        })
      }
    }

    if (acknowledgments.length > 0) {
      const { error } = await supabase
        .from('notification_acknowledgments')
        .upsert(acknowledgments, { 
          onConflict: 'user_id,budget_id,notification_type,related_entity_id,notification_date' 
        })

      if (error) throw error
    }

    return acknowledgments.length
  },

  // Clear acknowledgments (for re-notification)
  async clearAcknowledgments(supabase: any, userId: string, budgetIds?: string[], notificationTypes?: string[]) {
    let query = supabase
      .from('notification_acknowledgments')
      .delete()
      .eq('user_id', userId)

    if (budgetIds && budgetIds.length > 0) {
      query = query.in('budget_id', budgetIds)
    }

    if (notificationTypes && notificationTypes.length > 0) {
      query = query.in('notification_type', notificationTypes)
    }

    const { error, count } = await query

    if (error) throw error

    return count || 0
  }
}

console.log("Notifications function started")

serve(async (req) => {
  const startTime = Date.now()
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname
  
  console.log(`[NOTIFICATIONS REQUEST] ${method} ${path}`)

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    console.log(`[NOTIFICATIONS CORS] Preflight request handled for ${path}`)
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // All notification endpoints require authentication
    const user = await validateTokenAndGetUser(supabase, req.headers.get('authorization'))
    
    // Create authenticated Supabase client with the user's JWT token
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '') || ''
    const authenticatedSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      }
    )

    const urlParams = new URLSearchParams(url.search)

    // Route handling
    if ((path === '/notifications' || path === '/') && method === 'GET') {
      try {
        console.log(`[NOTIFICATIONS] Getting notifications for user: ${user.email}`)
        
        const budgetId = urlParams.get('budget_id') // Optional: filter to specific budget
        const timezone = urlParams.get('timezone') // Optional: user's timezone
        const today = getTodayDate(timezone)

        // Get user's budgets
        let budgetIds: string[] = []
        if (budgetId) {
          // Verify user has access to this budget
          const { data: budget } = await authenticatedSupabase
            .from('budgets')
            .select('id')
            .eq('id', budgetId)
            .single()
          
          if (budget) {
            budgetIds = [budgetId]
          } else {
            return createErrorResponse('Budget not found or access denied', 'BUDGET_NOT_FOUND', 404)
          }
        } else {
          // Get all user's budgets
          const { data: budgets } = await authenticatedSupabase
            .from('budgets')
            .select('id')
          
          budgetIds = budgets?.map(b => b.id) || []
        }

        if (budgetIds.length === 0) {
          return createSuccessResponse({ 
            success: true, 
            data: { 
              notifications: [], 
              total_count: 0,
              today: today 
            } 
          })
        }

        // Get acknowledged notifications to filter out
        const acknowledgedNotifications = await NotificationQueries.getAcknowledgedNotifications(
          authenticatedSupabase, user.id, budgetIds, today
        )

        // Get all notification types
        const [incomeNotifications, envelopeNotifications, transactionNotifications] = await Promise.all([
          NotificationQueries.getIncomeSourceNotifications(authenticatedSupabase, budgetIds, today, acknowledgedNotifications),
          NotificationQueries.getEnvelopeNotifications(authenticatedSupabase, budgetIds, today, acknowledgedNotifications),
          NotificationQueries.getTransactionNotifications(authenticatedSupabase, budgetIds, today, acknowledgedNotifications)
        ])

        const allNotifications = [
          ...incomeNotifications,
          ...envelopeNotifications,
          ...transactionNotifications
        ]

        // Sort by priority (high > medium > low) then by type
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        allNotifications.sort((a, b) => {
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
          if (priorityDiff !== 0) return priorityDiff
          return a.type.localeCompare(b.type)
        })

        console.log(`[NOTIFICATIONS SUCCESS] Found ${allNotifications.length} notifications for user: ${user.email}`)

        return createSuccessResponse({
          success: true,
          data: {
            notifications: allNotifications,
            total_count: allNotifications.length,
            today: today,
            budget_filter: budgetId || 'all'
          }
        })

      } catch (error: any) {
        console.error('[NOTIFICATIONS ERROR] Get notifications failed:', error)
        return createErrorResponse(error.message, 'GET_NOTIFICATIONS_FAILED', 500)
      }
    }

    else if (path === '/notifications/acknowledge' && method === 'POST') {
      try {
        const body = await req.json()
        const { notification_ids } = body

        if (!Array.isArray(notification_ids)) {
          return createErrorResponse('notification_ids must be an array', 'INVALID_NOTIFICATION_IDS', 400)
        }

        console.log(`[NOTIFICATIONS] Acknowledging ${notification_ids.length} notifications for user: ${user.email}`)

        const acknowledgedCount = await NotificationQueries.acknowledgeNotifications(
          authenticatedSupabase, user.id, notification_ids
        )

        return createSuccessResponse({
          success: true,
          data: {
            acknowledged_count: acknowledgedCount,
            notification_ids: notification_ids
          }
        })

      } catch (error: any) {
        console.error('[NOTIFICATIONS ERROR] Acknowledge notifications failed:', error)
        return createErrorResponse(error.message, 'ACKNOWLEDGE_NOTIFICATIONS_FAILED', 500)
      }
    }

    else if (path === '/notifications/clear' && method === 'DELETE') {
      try {
        const body = await req.json()
        const { budget_ids, notification_types } = body

        console.log(`[NOTIFICATIONS] Clearing acknowledgments for user: ${user.email}`)

        const clearedCount = await NotificationQueries.clearAcknowledgments(
          authenticatedSupabase, user.id, budget_ids, notification_types
        )

        return createSuccessResponse({
          success: true,
          data: {
            cleared_count: clearedCount,
            budget_ids: budget_ids || 'all',
            notification_types: notification_types || 'all'
          }
        })

      } catch (error: any) {
        console.error('[NOTIFICATIONS ERROR] Clear acknowledgments failed:', error)
        return createErrorResponse(error.message, 'CLEAR_ACKNOWLEDGMENTS_FAILED', 500)
      }
    }

    // Handle unsupported routes
    console.log(`[NOTIFICATIONS ERROR] Route not found: ${method} ${path}`)
    return createErrorResponse(
      `Route not found: ${method} ${path}`,
      'ROUTE_NOT_FOUND',
      404,
      {
        available_routes: [
          'GET /notifications?budget_id={id}&timezone={tz} - Get active notifications',
          'POST /notifications/acknowledge - Acknowledge notifications',
          'DELETE /notifications/clear - Clear acknowledgments for re-notification'
        ]
      }
    )

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[NOTIFICATIONS FATAL ERROR] Request failed after ${duration}ms:`, error)
    
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      {
        timestamp: new Date().toISOString(),
        request: `${method} ${path}`,
        duration: `${duration}ms`
      }
    )
  } finally {
    const duration = Date.now() - startTime
    console.log(`[NOTIFICATIONS REQUEST COMPLETE] ${method} ${path} - ${duration}ms`)
  }
})