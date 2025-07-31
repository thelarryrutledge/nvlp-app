import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
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

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(p => p)
    
    // Handle POST /budgets/{budgetId}/envelopes/bulk-allocate
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'envelopes' && pathParts[3] === 'bulk-allocate') {
      
      const budgetId = pathParts[1]
      
      // Verify budget access and get available amount
      const { data: budget, error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id, available_amount')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single()

      if (budgetError) {
        if (budgetError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Budget not found or access denied' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw budgetError
      }

      // Parse request body
      const body = await req.json()
      
      if (!Array.isArray(body.allocations) || body.allocations.length === 0) {
        return new Response(
          JSON.stringify({ error: 'allocations array is required and must not be empty' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Validate allocations and calculate total
      let totalAllocation = 0
      const validatedAllocations = []

      for (let i = 0; i < body.allocations.length; i++) {
        const allocation = body.allocations[i]
        
        if (!allocation.envelope_id || !allocation.amount || allocation.amount <= 0) {
          return new Response(
            JSON.stringify({ 
              error: `Invalid allocation at index ${i}: envelope_id and positive amount are required` 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        totalAllocation += allocation.amount
        validatedAllocations.push({
          envelope_id: allocation.envelope_id,
          amount: allocation.amount,
          description: allocation.description || `Bulk allocation`
        })
      }

      // Check if sufficient funds available
      if (totalAllocation > budget.available_amount) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient available funds',
            available: budget.available_amount,
            required: totalAllocation,
            shortfall: totalAllocation - budget.available_amount
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Verify all envelopes exist and are active
      const envelopeIds = validatedAllocations.map(a => a.envelope_id)
      const { data: envelopes, error: envelopesError } = await supabaseClient
        .from('envelopes')
        .select('id, name, is_active')
        .eq('budget_id', budgetId)
        .in('id', envelopeIds)

      if (envelopesError) throw envelopesError

      if (!envelopes || envelopes.length !== envelopeIds.length) {
        return new Response(
          JSON.stringify({ error: 'One or more envelopes not found or do not belong to this budget' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const inactiveEnvelopes = envelopes.filter(e => !e.is_active)
      if (inactiveEnvelopes.length > 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Cannot allocate to inactive envelopes',
            inactive_envelopes: inactiveEnvelopes.map(e => ({ id: e.id, name: e.name }))
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Create allocation transactions
      const transactions = validatedAllocations.map(allocation => ({
        budget_id: budgetId,
        transaction_type: 'allocation',
        amount: allocation.amount,
        transaction_date: new Date().toISOString().split('T')[0],
        description: allocation.description,
        to_envelope_id: allocation.envelope_id,
        is_cleared: true,
        is_reconciled: false
      }))

      const { data: createdTransactions, error: transactionsError } = await supabaseClient
        .from('transactions')
        .insert(transactions)
        .select()

      if (transactionsError) throw transactionsError

      return new Response(
        JSON.stringify({ 
          message: 'Bulk allocation completed successfully',
          transactions: createdTransactions,
          total_allocated: totalAllocation,
          remaining_available: budget.available_amount - totalAllocation,
          envelope_count: validatedAllocations.length
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle POST /budgets/{budgetId}/envelopes/rebalance
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'envelopes' && pathParts[3] === 'rebalance') {
      
      const budgetId = pathParts[1]
      
      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single()

      if (budgetError) {
        if (budgetError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Budget not found or access denied' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw budgetError
      }

      // Parse request body
      const body = await req.json()
      
      if (!body.strategy) {
        return new Response(
          JSON.stringify({ error: 'rebalancing strategy is required' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get all active envelopes with current balances and targets
      const { data: envelopes, error: envelopesError } = await supabaseClient
        .from('envelopes')
        .select('id, name, current_balance, target_amount, envelope_type')
        .eq('budget_id', budgetId)
        .eq('is_active', true)
        .gt('target_amount', 0) // Only envelopes with targets can be rebalanced

      if (envelopesError) throw envelopesError

      if (!envelopes || envelopes.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No active envelopes with targets found for rebalancing' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const rebalanceTransactions = []
      let totalTransferAmount = 0

      switch (body.strategy) {
        case 'target_based':
          // Move excess funds from over-funded envelopes to under-funded ones
          const overfunded = envelopes.filter(e => e.current_balance > e.target_amount).sort((a, b) => (b.current_balance - b.target_amount) - (a.current_balance - a.target_amount))
          const underfunded = envelopes.filter(e => e.current_balance < e.target_amount).sort((a, b) => (a.current_balance / a.target_amount) - (b.current_balance / b.target_amount))
          
          for (const sourceEnvelope of overfunded) {
            const excess = sourceEnvelope.current_balance - sourceEnvelope.target_amount
            let remainingExcess = excess
            
            for (const targetEnvelope of underfunded) {
              if (remainingExcess <= 0) break
              
              const needed = targetEnvelope.target_amount - targetEnvelope.current_balance
              if (needed <= 0) continue
              
              const transferAmount = Math.min(remainingExcess, needed)
              
              rebalanceTransactions.push({
                budget_id: budgetId,
                transaction_type: 'transfer',
                amount: transferAmount,
                transaction_date: new Date().toISOString().split('T')[0],
                description: `Rebalance: ${sourceEnvelope.name} → ${targetEnvelope.name}`,
                from_envelope_id: sourceEnvelope.id,
                to_envelope_id: targetEnvelope.id,
                is_cleared: true,
                is_reconciled: false
              })
              
              remainingExcess -= transferAmount
              targetEnvelope.current_balance += transferAmount // Update for next iteration
              totalTransferAmount += transferAmount
            }
          }
          break

        case 'proportional':
          // Redistribute all funds proportionally based on targets
          const totalBalance = envelopes.reduce((sum, e) => sum + e.current_balance, 0)
          const totalTargets = envelopes.reduce((sum, e) => sum + e.target_amount, 0)
          
          if (totalTargets === 0) {
            return new Response(
              JSON.stringify({ error: 'Cannot perform proportional rebalancing with zero total targets' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          // Calculate ideal balances based on proportion of targets
          const idealBalances = envelopes.map(e => ({
            ...e,
            ideal_balance: (e.target_amount / totalTargets) * totalBalance
          }))
          
          // Create transfers to achieve ideal balances
          const sources = idealBalances.filter(e => e.current_balance > e.ideal_balance).sort((a, b) => (b.current_balance - b.ideal_balance) - (a.current_balance - a.ideal_balance))
          const targets = idealBalances.filter(e => e.current_balance < e.ideal_balance).sort((a, b) => (a.current_balance - a.ideal_balance) - (b.current_balance - b.ideal_balance))
          
          for (const source of sources) {
            const excess = source.current_balance - source.ideal_balance
            let remainingExcess = excess
            
            for (const target of targets) {
              if (remainingExcess <= 0.01) break // Avoid tiny transfers
              
              const needed = target.ideal_balance - target.current_balance
              if (needed <= 0.01) continue
              
              const transferAmount = Math.min(remainingExcess, needed)
              
              if (transferAmount >= 0.01) { // Only create transfers >= 1 cent
                rebalanceTransactions.push({
                  budget_id: budgetId,
                  transaction_type: 'transfer',
                  amount: Math.round(transferAmount * 100) / 100, // Round to cents
                  transaction_date: new Date().toISOString().split('T')[0],
                  description: `Proportional rebalance: ${source.name} → ${target.name}`,
                  from_envelope_id: source.id,
                  to_envelope_id: target.id,
                  is_cleared: true,
                  is_reconciled: false
                })
                
                remainingExcess -= transferAmount
                target.current_balance += transferAmount
                totalTransferAmount += transferAmount
              }
            }
          }
          break

        case 'emergency_fund_priority':
          // Prioritize emergency fund, then rebalance others
          const emergencyFund = envelopes.find(e => e.envelope_type === 'savings' || e.name.toLowerCase().includes('emergency'))
          if (!emergencyFund) {
            return new Response(
              JSON.stringify({ error: 'No emergency fund envelope found for priority rebalancing' }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          const otherEnvelopes = envelopes.filter(e => e.id !== emergencyFund.id)
          const emergencyShortfall = Math.max(0, emergencyFund.target_amount - emergencyFund.current_balance)
          
          if (emergencyShortfall > 0) {
            // Find envelopes with excess to fund emergency fund
            const excessEnvelopes = otherEnvelopes.filter(e => e.current_balance > e.target_amount * 0.8).sort((a, b) => (b.current_balance - b.target_amount) - (a.current_balance - a.target_amount))
            
            let remainingShortfall = emergencyShortfall
            
            for (const envelope of excessEnvelopes) {
              if (remainingShortfall <= 0) break
              
              const availableExcess = Math.max(0, envelope.current_balance - envelope.target_amount * 0.8)
              const transferAmount = Math.min(remainingShortfall, availableExcess)
              
              if (transferAmount > 0) {
                rebalanceTransactions.push({
                  budget_id: budgetId,
                  transaction_type: 'transfer',
                  amount: transferAmount,
                  transaction_date: new Date().toISOString().split('T')[0],
                  description: `Emergency fund priority: ${envelope.name} → ${emergencyFund.name}`,
                  from_envelope_id: envelope.id,
                  to_envelope_id: emergencyFund.id,
                  is_cleared: true,
                  is_reconciled: false
                })
                
                remainingShortfall -= transferAmount
                totalTransferAmount += transferAmount
              }
            }
          }
          break

        default:
          return new Response(
            JSON.stringify({ 
              error: 'Invalid rebalancing strategy',
              valid_strategies: ['target_based', 'proportional', 'emergency_fund_priority']
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
      }

      if (rebalanceTransactions.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'No rebalancing needed - envelopes are already optimally balanced',
            strategy: body.strategy
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Create rebalance transactions
      const { data: createdTransactions, error: transactionsError } = await supabaseClient
        .from('transactions')
        .insert(rebalanceTransactions)
        .select()

      if (transactionsError) throw transactionsError

      return new Response(
        JSON.stringify({ 
          message: 'Envelope rebalancing completed successfully',
          strategy: body.strategy,
          transactions: createdTransactions,
          total_transferred: totalTransferAmount,
          transfer_count: rebalanceTransactions.length
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle POST /budgets/{budgetId}/envelopes/bulk-target-update
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'envelopes' && pathParts[3] === 'bulk-target-update') {
      
      const budgetId = pathParts[1]
      
      // Verify budget access
      const { error: budgetError } = await supabaseClient
        .from('budgets')
        .select('id')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single()

      if (budgetError) {
        if (budgetError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Budget not found or access denied' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        throw budgetError
      }

      // Parse request body
      const body = await req.json()
      
      if (!body.update_type) {
        return new Response(
          JSON.stringify({ error: 'update_type is required' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get envelopes to update
      let envelopesToUpdate = []
      
      if (body.envelope_ids && Array.isArray(body.envelope_ids)) {
        // Specific envelopes
        const { data: envelopes, error: envelopesError } = await supabaseClient
          .from('envelopes')
          .select('id, name, target_amount, current_balance')
          .eq('budget_id', budgetId)
          .eq('is_active', true)
          .in('id', body.envelope_ids)

        if (envelopesError) throw envelopesError
        envelopesToUpdate = envelopes || []
      } else {
        // All active envelopes
        const { data: envelopes, error: envelopesError } = await supabaseClient
          .from('envelopes')
          .select('id, name, target_amount, current_balance')
          .eq('budget_id', budgetId)
          .eq('is_active', true)

        if (envelopesError) throw envelopesError
        envelopesToUpdate = envelopes || []
      }

      if (envelopesToUpdate.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No envelopes found to update' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const updates = []

      switch (body.update_type) {
        case 'percentage_increase':
          if (!body.percentage || body.percentage <= -100) {
            return new Response(
              JSON.stringify({ error: 'Valid percentage is required for percentage_increase' }),
              { 
                status: 400,  
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          
          for (const envelope of envelopesToUpdate) {
            const newTarget = Math.round(envelope.target_amount * (1 + body.percentage / 100) * 100) / 100
            updates.push({
              id: envelope.id,
              target_amount: Math.max(0, newTarget)
            })
          }
          break

        case 'set_to_current_balance':
          for (const envelope of envelopesToUpdate) {
            updates.push({
              id: envelope.id,
              target_amount: Math.max(0, envelope.current_balance)
            })
          }
          break

        case 'round_to_nearest':
          const roundTo = body.round_to || 50
          
          for (const envelope of envelopesToUpdate) {
            const rounded = Math.round(envelope.target_amount / roundTo) * roundTo
            updates.push({
              id: envelope.id,
              target_amount: Math.max(0, rounded)
            })
          }
          break

        case 'inflation_adjustment':
          const inflationRate = body.inflation_rate || 3.0 // Default 3%
          
          for (const envelope of envelopesToUpdate) {
            const adjusted = Math.round(envelope.target_amount * (1 + inflationRate / 100) * 100) / 100
            updates.push({
              id: envelope.id,
              target_amount: adjusted
            })
          }
          break

        default:
          return new Response(
            JSON.stringify({ 
              error: 'Invalid update_type',
              valid_types: ['percentage_increase', 'set_to_current_balance', 'round_to_nearest', 'inflation_adjustment']
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
      }

      // Apply updates
      const updatedEnvelopes = []
      
      for (const update of updates) {
        const { data: updatedEnvelope, error: updateError } = await supabaseClient
          .from('envelopes')
          .update({ 
            target_amount: update.target_amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
          .eq('budget_id', budgetId)
          .select()
          .single()

        if (updateError) {
          console.error(`Failed to update envelope ${update.id}:`, updateError)
        } else {
          updatedEnvelopes.push(updatedEnvelope)
        }
      }

      return new Response(
        JSON.stringify({ 
          message: 'Bulk target update completed successfully',
          update_type: body.update_type,
          updated_envelopes: updatedEnvelopes,
          updated_count: updatedEnvelopes.length,
          total_requested: updates.length
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Method/path not found
    return new Response(
      JSON.stringify({ error: 'Not Found' }),
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
})