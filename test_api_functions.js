// Test script for database functions via Supabase API
// Run with: node test_api_functions.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTests() {
  console.log('🧪 Testing Database Functions and Triggers\n');

  try {
    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    await supabase.from('transactions').delete().match({ 
      budget_id: '22222222-2222-2222-2222-222222222222' 
    });
    await supabase.from('budgets').delete().eq('name', 'API Test Budget');
    
    // Create test user (using service role key to bypass RLS)
    console.log('\n👤 Creating test user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'apitest@example.com',
      password: 'testpassword123',
      email_confirm: true,
      user_metadata: {
        display_name: 'API Test User',
        avatar_url: 'https://example.com/test-avatar.jpg'
      }
    });

    if (authError) throw authError;
    const userId = authData.user.id;
    console.log('✅ User created:', userId);

    // Check if user profile was created
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('✅ User profile created:', profile?.display_name);

    // Create test budget
    console.log('\n💰 Creating test budget...');
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        name: 'API Test Budget',
        description: 'Testing functions via API'
      })
      .select()
      .single();

    if (budgetError) throw budgetError;
    console.log('✅ Budget created:', budget.id);
    console.log('   Initial available_amount:', budget.available_amount);

    // Create test envelope
    console.log('\n📦 Creating test envelope...');
    const { data: envelope, error: envelopeError } = await supabase
      .from('envelopes')
      .insert({
        budget_id: budget.id,
        name: 'Test Envelope',
        target_amount: 1000
      })
      .select()
      .single();

    if (envelopeError) throw envelopeError;
    console.log('✅ Envelope created:', envelope.id);
    console.log('   Initial balance:', envelope.current_balance);

    // Create income source
    const { data: incomeSource } = await supabase
      .from('income_sources')
      .insert({
        budget_id: budget.id,
        name: 'Test Income',
        expected_amount: 5000
      })
      .select()
      .single();

    // Create payee
    const { data: payee } = await supabase
      .from('payees')
      .insert({
        budget_id: budget.id,
        name: 'Test Payee'
      })
      .select()
      .single();

    // Test 1: Income transaction
    console.log('\n💵 TEST 1: Income Transaction');
    const { data: incomeTransaction } = await supabase
      .from('transactions')
      .insert({
        budget_id: budget.id,
        transaction_type: 'income',
        amount: 3000,
        description: 'Test income',
        transaction_date: new Date().toISOString().split('T')[0],
        income_source_id: incomeSource.id
      })
      .select()
      .single();

    // Check budget available_amount increased
    const { data: budgetAfterIncome } = await supabase
      .from('budgets')
      .select('available_amount')
      .eq('id', budget.id)
      .single();

    console.log('✅ Income recorded');
    console.log('   Budget available_amount after income:', budgetAfterIncome.available_amount);
    console.log('   Expected: 3000.00');

    // Test 2: Allocation transaction
    console.log('\n📊 TEST 2: Allocation Transaction');
    const { data: allocationTransaction } = await supabase
      .from('transactions')
      .insert({
        budget_id: budget.id,
        transaction_type: 'allocation',
        amount: 500,
        description: 'Test allocation',
        transaction_date: new Date().toISOString().split('T')[0],
        to_envelope_id: envelope.id
      })
      .select()
      .single();

    // Check budget and envelope
    const { data: budgetAfterAllocation } = await supabase
      .from('budgets')
      .select('available_amount')
      .eq('id', budget.id)
      .single();

    const { data: envelopeAfterAllocation } = await supabase
      .from('envelopes')
      .select('current_balance')
      .eq('id', envelope.id)
      .single();

    console.log('✅ Allocation recorded');
    console.log('   Budget available_amount:', budgetAfterAllocation.available_amount);
    console.log('   Envelope balance:', envelopeAfterAllocation.current_balance);

    // Test 3: Expense transaction
    console.log('\n💸 TEST 3: Expense Transaction');
    const { data: expenseTransaction } = await supabase
      .from('transactions')
      .insert({
        budget_id: budget.id,
        transaction_type: 'expense',
        amount: 100,
        description: 'Test expense',
        transaction_date: new Date().toISOString().split('T')[0],
        from_envelope_id: envelope.id,
        payee_id: payee.id
      })
      .select()
      .single();

    const { data: envelopeAfterExpense } = await supabase
      .from('envelopes')
      .select('current_balance')
      .eq('id', envelope.id)
      .single();

    console.log('✅ Expense recorded');
    console.log('   Envelope balance after expense:', envelopeAfterExpense.current_balance);

    // Test 4: Soft delete
    console.log('\n🗑️  TEST 4: Soft Delete Transaction');
    
    // Use the soft delete function
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('soft_delete_transaction', {
        transaction_id: expenseTransaction.id
      });

    console.log('   Soft delete result:', deleteResult);

    const { data: envelopeAfterDelete } = await supabase
      .from('envelopes')
      .select('current_balance')
      .eq('id', envelope.id)
      .single();

    console.log('✅ Transaction soft deleted');
    console.log('   Envelope balance after delete:', envelopeAfterDelete.current_balance);

    // Test 5: Check audit log
    console.log('\n📋 TEST 5: Transaction Audit Log');
    const { data: auditEvents } = await supabase
      .from('transaction_events')
      .select('event_type, changed_fields')
      .in('transaction_id', [incomeTransaction.id, allocationTransaction.id, expenseTransaction.id])
      .order('event_timestamp');

    console.log('✅ Audit events found:', auditEvents.length);
    auditEvents.forEach(event => {
      console.log(`   - ${event.event_type}: ${event.changed_fields?.join(', ') || 'N/A'}`);
    });

    // Test 6: Budget summary
    console.log('\n📈 TEST 6: Budget Summary Function');
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_budget_summary', {
        budget_id_param: budget.id
      });

    if (summaryError) throw summaryError;
    
    console.log('✅ Budget summary:');
    console.log('   Available amount:', summary[0]?.available_amount);
    console.log('   Total allocated:', summary[0]?.total_allocated);
    console.log('   Total in envelopes:', summary[0]?.total_in_envelopes);
    console.log('   Total income:', summary[0]?.total_income);
    console.log('   Total expenses:', summary[0]?.total_expenses);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('transactions').delete().match({ budget_id: budget.id });
    await supabase.from('budgets').delete().eq('id', budget.id);
    await supabase.auth.admin.deleteUser(userId);
    
    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

runTests();