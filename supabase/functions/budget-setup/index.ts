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
    
    // Handle POST /budgets/{budgetId}/setup/defaults
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'setup' && pathParts[3] === 'defaults') {
      
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

      // Check if setup has already been run (idempotent)
      const { data: existingCategories } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('budget_id', budgetId)
        .limit(1)

      if (existingCategories && existingCategories.length > 0) {
        return new Response(
          JSON.stringify({ 
            message: 'Budget already has categories - setup appears to be complete',
            existing_setup: true
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const createdItems = {
        categories: [],
        envelopes: [],
        income_sources: [],
        payees: []
      }

      try {
        // 1. Create default categories
        const defaultCategories = [
          // Expense categories
          { name: 'Housing', is_income: false, display_order: 1 },
          { name: 'Transportation', is_income: false, display_order: 2 },
          { name: 'Food & Dining', is_income: false, display_order: 3 },
          { name: 'Utilities', is_income: false, display_order: 4 },
          { name: 'Healthcare', is_income: false, display_order: 5 },
          { name: 'Entertainment', is_income: false, display_order: 6 },
          { name: 'Personal Care', is_income: false, display_order: 7 },
          { name: 'Debt Payments', is_income: false, display_order: 8 },
          { name: 'Savings & Investments', is_income: false, display_order: 9 },
          { name: 'Miscellaneous', is_income: false, display_order: 10 },
          // Income categories
          { name: 'Salary & Wages', is_income: true, display_order: 1 },
          { name: 'Business Income', is_income: true, display_order: 2 },
          { name: 'Investment Income', is_income: true, display_order: 3 },
          { name: 'Other Income', is_income: true, display_order: 4 }
        ]

        const { data: categories, error: categoriesError } = await supabaseClient
          .from('categories')
          .insert(defaultCategories.map(cat => ({ ...cat, budget_id: budgetId })))
          .select()

        if (categoriesError) throw categoriesError
        createdItems.categories = categories

        // 2. Create default income sources
        const { data: incomeCategories } = await supabaseClient
          .from('categories')
          .select('id, name')
          .eq('budget_id', budgetId)
          .eq('is_income', true)

        const salaryCategory = incomeCategories?.find(c => c.name === 'Salary & Wages')
        
        const defaultIncomeSources = [
          {
            name: 'Primary Job',
            category_id: salaryCategory?.id || null,
            expected_amount: 0,
            frequency: 'monthly',
            is_active: true
          }
        ]

        const { data: incomeSources, error: incomeError } = await supabaseClient
          .from('income_sources')
          .insert(defaultIncomeSources.map(income => ({ ...income, budget_id: budgetId })))
          .select()

        if (incomeError) throw incomeError
        createdItems.income_sources = incomeSources

        // 3. Create default envelopes
        const categoryMap = new Map(categories.map(c => [c.name, c.id]))
        
        const defaultEnvelopes = [
          // Essential envelopes
          { name: 'Emergency Fund', category_id: categoryMap.get('Savings & Investments'), envelope_type: 'savings', target_amount: 1000, display_order: 1 },
          { name: 'Rent/Mortgage', category_id: categoryMap.get('Housing'), envelope_type: 'general', target_amount: 0, display_order: 2 },
          { name: 'Groceries', category_id: categoryMap.get('Food & Dining'), envelope_type: 'general', target_amount: 0, display_order: 3 },
          { name: 'Gas & Transportation', category_id: categoryMap.get('Transportation'), envelope_type: 'general', target_amount: 0, display_order: 4 },
          { name: 'Utilities', category_id: categoryMap.get('Utilities'), envelope_type: 'general', target_amount: 0, display_order: 5 },
          { name: 'Phone & Internet', category_id: categoryMap.get('Utilities'), envelope_type: 'general', target_amount: 0, display_order: 6 },
          { name: 'Healthcare & Medical', category_id: categoryMap.get('Healthcare'), envelope_type: 'general', target_amount: 0, display_order: 7 },
          { name: 'Entertainment & Dining Out', category_id: categoryMap.get('Entertainment'), envelope_type: 'general', target_amount: 0, display_order: 8 },
          { name: 'Personal & Miscellaneous', category_id: categoryMap.get('Personal Care'), envelope_type: 'general', target_amount: 0, display_order: 9 },
          { name: 'Clothing & Personal Care', category_id: categoryMap.get('Personal Care'), envelope_type: 'general', target_amount: 0, display_order: 10 }
        ]

        const { data: envelopes, error: envelopesError } = await supabaseClient
          .from('envelopes')
          .insert(defaultEnvelopes.map(env => ({ 
            ...env, 
            budget_id: budgetId,
            current_balance: 0,
            is_active: true 
          })))
          .select()

        if (envelopesError) throw envelopesError
        createdItems.envelopes = envelopes

        // 4. Create default payees
        const defaultPayees = [
          { name: 'Grocery Store', is_debt: false, is_active: true },
          { name: 'Gas Station', is_debt: false, is_active: true },
          { name: 'Restaurant', is_debt: false, is_active: true },
          { name: 'Online Purchase', is_debt: false, is_active: true },
          { name: 'ATM Withdrawal', is_debt: false, is_active: true },
          { name: 'Utility Company', is_debt: false, is_active: true },
          { name: 'Insurance Company', is_debt: false, is_active: true },
          { name: 'Bank Transfer', is_debt: false, is_active: true }
        ]

        const { data: payees, error: payeesError } = await supabaseClient
          .from('payees')
          .insert(defaultPayees.map(payee => ({ ...payee, budget_id: budgetId })))
          .select()

        if (payeesError) throw payeesError
        createdItems.payees = payees

        return new Response(
          JSON.stringify({ 
            message: 'Default budget setup completed successfully',
            created: {
              categories: createdItems.categories.length,
              envelopes: createdItems.envelopes.length,
              income_sources: createdItems.income_sources.length,
              payees: createdItems.payees.length
            },
            items: createdItems
          }),
          { 
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )

      } catch (error) {
        // Rollback on error by deleting any created items
        console.error('Setup failed, attempting rollback:', error)
        
        // Clean up in reverse order
        if (createdItems.payees.length > 0) {
          await supabaseClient.from('payees').delete().in('id', createdItems.payees.map(p => p.id))
        }
        if (createdItems.envelopes.length > 0) {
          await supabaseClient.from('envelopes').delete().in('id', createdItems.envelopes.map(e => e.id))
        }
        if (createdItems.income_sources.length > 0) {
          await supabaseClient.from('income_sources').delete().in('id', createdItems.income_sources.map(i => i.id))
        }
        if (createdItems.categories.length > 0) {
          await supabaseClient.from('categories').delete().in('id', createdItems.categories.map(c => c.id))
        }

        throw error
      }
    }

    // Handle POST /budgets/{budgetId}/setup/demo
    if (req.method === 'POST' && pathParts.length === 4 && 
        pathParts[0] === 'budgets' && pathParts[2] === 'setup' && pathParts[3] === 'demo') {
      
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

      // Check if budget has basic setup (categories and envelopes)
      const [categoriesResult, envelopesResult] = await Promise.all([
        supabaseClient.from('categories').select('id, name').eq('budget_id', budgetId),
        supabaseClient.from('envelopes').select('id, name').eq('budget_id', budgetId)
      ])

      if (!categoriesResult.data || categoriesResult.data.length === 0 ||
          !envelopesResult.data || envelopesResult.data.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Budget must have categories and envelopes before adding demo data. Run defaults setup first.',
            suggestion: 'POST /budgets/{budgetId}/setup/defaults'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const createdItems = {
        transactions: [],
        updated_envelopes: [],
        updated_budget: null
      }

      try {
        // Get available envelopes and categories for demo data
        const { data: envelopes } = await supabaseClient
          .from('envelopes')
          .select('id, name, envelope_type')
          .eq('budget_id', budgetId)
          .eq('is_active', true)

        const { data: payees } = await supabaseClient
          .from('payees')
          .select('id, name')
          .eq('budget_id', budgetId)
          .eq('is_active', true)

        const { data: incomeSources } = await supabaseClient
          .from('income_sources')
          .select('id, name')
          .eq('budget_id', budgetId)
          .eq('is_active', true)

        if (!envelopes || !payees || !incomeSources) {
          throw new Error('Missing required budget entities for demo data')
        }

        // Helper function to get random item from array
        const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
        
        // Helper function to get random amount within range
        const getRandomAmount = (min: number, max: number) => 
          Math.round((Math.random() * (max - min) + min) * 100) / 100

        // 1. Create demo income transactions (last 3 months)
        const demoTransactions = []
        const today = new Date()
        
        // Monthly income for last 3 months
        for (let month = 2; month >= 0; month--) {
          const incomeDate = new Date(today.getFullYear(), today.getMonth() - month, 15)
          demoTransactions.push({
            budget_id: budgetId,
            transaction_type: 'income',
            amount: getRandomAmount(3000, 5000),
            transaction_date: incomeDate.toISOString().split('T')[0],
            description: 'Monthly Salary',
            income_source_id: getRandom(incomeSources).id,
            is_cleared: true,
            is_reconciled: month > 0
          })
        }

        // 2. Create allocation transactions to fund envelopes
        const nonSavingsEnvelopes = envelopes.filter(e => e.envelope_type !== 'savings')
        const savingsEnvelopes = envelopes.filter(e => e.envelope_type === 'savings')

        // Allocate to regular envelopes
        for (const envelope of nonSavingsEnvelopes.slice(0, 8)) {
          demoTransactions.push({
            budget_id: budgetId,
            transaction_type: 'allocation',
            amount: getRandomAmount(200, 800),
            transaction_date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
            description: `Fund ${envelope.name}`,
            to_envelope_id: envelope.id,
            is_cleared: true,
            is_reconciled: false
          })
        }

        // Allocate to savings
        if (savingsEnvelopes.length > 0) {
          demoTransactions.push({
            budget_id: budgetId,
            transaction_type: 'allocation',
            amount: getRandomAmount(300, 600),
            transaction_date: new Date(today.getFullYear(), today.getMonth(), 2).toISOString().split('T')[0],
            description: `Build Emergency Fund`,
            to_envelope_id: getRandom(savingsEnvelopes).id,
            is_cleared: true,
            is_reconciled: false
          })
        }

        // 3. Create realistic expense transactions
        const expensePatterns = [
          { days: [1, 15], payee: 'Grocery Store', amount: [80, 150], envelope: 'Groceries' },
          { days: [5, 12, 19, 26], payee: 'Gas Station', amount: [35, 65], envelope: 'Gas & Transportation' },
          { days: [10], payee: 'Utility Company', amount: [120, 200], envelope: 'Utilities' },
          { days: [8, 22], payee: 'Restaurant', amount: [25, 75], envelope: 'Entertainment & Dining Out' },
          { days: [3, 17], payee: 'Online Purchase', amount: [20, 100], envelope: 'Personal & Miscellaneous' }
        ]

        for (const pattern of expensePatterns) {
          const matchingPayee = payees.find(p => p.name.includes(pattern.payee.split(' ')[0]))
          const matchingEnvelope = envelopes.find(e => e.name.includes(pattern.envelope.split(' ')[0]))
          
          if (matchingPayee && matchingEnvelope) {
            for (const day of pattern.days) {
              const expenseDate = new Date(today.getFullYear(), today.getMonth(), day)
              
              // Only create if date is not in future
              if (expenseDate <= today) {
                demoTransactions.push({
                  budget_id: budgetId,
                  transaction_type: 'expense',
                  amount: getRandomAmount(pattern.amount[0], pattern.amount[1]),
                  transaction_date: expenseDate.toISOString().split('T')[0],
                  description: `${pattern.payee} purchase`,
                  from_envelope_id: matchingEnvelope.id,
                  payee_id: matchingPayee.id,
                  is_cleared: Math.random() > 0.3, // 70% cleared
                  is_reconciled: Math.random() > 0.7 // 30% reconciled
                })
              }
            }
          }
        }

        // 4. Add some envelope transfers
        if (envelopes.length >= 2) {
          demoTransactions.push({
            budget_id: budgetId,
            transaction_type: 'transfer',
            amount: getRandomAmount(50, 150),
            transaction_date: new Date(today.getFullYear(), today.getMonth(), 20).toISOString().split('T')[0],
            description: 'Reallocate funds',
            from_envelope_id: getRandom(nonSavingsEnvelopes).id,
            to_envelope_id: getRandom(nonSavingsEnvelopes.filter(e => e.id !== demoTransactions[demoTransactions.length - 1]?.from_envelope_id)).id,
            is_cleared: true,
            is_reconciled: false
          })
        }

        // 5. Create one negative balance scenario for testing
        const groceryEnvelope = envelopes.find(e => e.name.includes('Groceries'))
        const groceryPayee = payees.find(p => p.name.includes('Grocery'))
        
        if (groceryEnvelope && groceryPayee) {
          demoTransactions.push({
            budget_id: budgetId,
            transaction_type: 'expense',
            amount: getRandomAmount(200, 300), // Large expense to potentially cause negative balance
            transaction_date: new Date(today.getFullYear(), today.getMonth(), 25).toISOString().split('T')[0],
            description: 'Large grocery shopping - monthly stock up',
            from_envelope_id: groceryEnvelope.id,
            payee_id: groceryPayee.id,
            is_cleared: false, // Leave uncleared for demo
            is_reconciled: false
          })
        }

        // Insert all demo transactions
        const { data: transactions, error: transactionsError } = await supabaseClient
          .from('transactions')
          .insert(demoTransactions)
          .select()

        if (transactionsError) throw transactionsError
        createdItems.transactions = transactions

        // Update budget with some available amount
        const { data: updatedBudget, error: budgetUpdateError } = await supabaseClient
          .from('budgets')
          .update({ available_amount: getRandomAmount(500, 1500) })
          .eq('id', budgetId)
          .select()
          .single()

        if (budgetUpdateError) throw budgetUpdateError
        createdItems.updated_budget = updatedBudget

        return new Response(
          JSON.stringify({ 
            message: 'Demo data created successfully',
            created: {
              transactions: createdItems.transactions.length,
              income_transactions: createdItems.transactions.filter(t => t.transaction_type === 'income').length,
              allocation_transactions: createdItems.transactions.filter(t => t.transaction_type === 'allocation').length,
              expense_transactions: createdItems.transactions.filter(t => t.transaction_type === 'expense').length,
              transfer_transactions: createdItems.transactions.filter(t => t.transaction_type === 'transfer').length
            },
            summary: {
              time_period: 'Last 3 months with current month activity',
              scenarios_included: [
                'Monthly salary income',
                'Regular envelope funding',
                'Realistic spending patterns',
                'Some uncleared transactions',
                'Envelope transfers',
                'One potential overspending scenario'
              ]
            }
          }),
          { 
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )

      } catch (error) {
        console.error('Demo setup failed:', error)
        throw error
      }
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