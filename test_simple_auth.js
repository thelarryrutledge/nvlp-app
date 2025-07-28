// Simple test to debug RLS and soft delete
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function test() {
  console.log('🧪 Testing Authentication and Soft Delete\n');

  // Create client with anon key for auth
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Sign in
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'larryjrutledge@gmail.com',
    password: 'Test1234!'
  });

  if (authError) {
    console.error('Auth failed:', authError);
    return;
  }

  console.log('✅ Signed in as:', auth.user.email);
  console.log('   User ID:', auth.user.id);

  // The supabase client now has the session and will include the auth token in all requests
  console.log('\n📦 Creating test budget...');
  
  // Need to specify user_id that matches auth.uid() for RLS policy
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .insert({
      user_id: auth.user.id,  // This must match auth.uid() for RLS
      name: 'Soft Delete Test Budget',
      description: 'Testing soft delete functionality'
    })
    .select()
    .single();

  if (budgetError) {
    console.error('❌ Budget creation failed:', budgetError);
    return;
  }

  console.log('✅ Budget created:', budget.id);
  console.log('   Initial available_amount:', budget.available_amount);

  // Create test data
  console.log('\n📋 Setting up test data...');
  
  // Income source
  const { data: incomeSource } = await supabase
    .from('income_sources')
    .insert({
      budget_id: budget.id,
      name: 'Test Salary',
      expected_amount: 5000
    })
    .select()
    .single();

  // Envelope
  const { data: envelope } = await supabase
    .from('envelopes')
    .insert({
      budget_id: budget.id,
      name: 'Test Envelope',
      target_amount: 1000
    })
    .select()
    .single();

  // Payee
  const { data: payee } = await supabase
    .from('payees')
    .insert({
      budget_id: budget.id,
      name: 'Test Store'
    })
    .select()
    .single();

  console.log('✅ Created income source, envelope, and payee');

  // Test transaction flow
  console.log('\n💰 Testing transaction flow...');

  // 1. Income transaction
  const { data: incomeTx } = await supabase
    .from('transactions')
    .insert({
      budget_id: budget.id,
      transaction_type: 'income',
      amount: 3000,
      description: 'Salary payment',
      transaction_date: new Date().toISOString().split('T')[0],
      income_source_id: incomeSource.id
    })
    .select()
    .single();

  const { data: budgetAfterIncome } = await supabase
    .from('budgets')
    .select('available_amount')
    .eq('id', budget.id)
    .single();

  console.log('1️⃣ Income transaction created');
  console.log('   Budget available_amount: $' + budgetAfterIncome.available_amount);

  // 2. Allocation transaction
  const { data: allocationTx } = await supabase
    .from('transactions')
    .insert({
      budget_id: budget.id,
      transaction_type: 'allocation',
      amount: 800,
      description: 'Allocate to envelope',
      transaction_date: new Date().toISOString().split('T')[0],
      to_envelope_id: envelope.id
    })
    .select()
    .single();

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

  console.log('2️⃣ Allocation transaction created');
  console.log('   Budget available_amount: $' + budgetAfterAllocation.available_amount);
  console.log('   Envelope balance: $' + envelopeAfterAllocation.current_balance);

  // 3. Expense transaction (this will be soft deleted)
  const { data: expenseTx } = await supabase
    .from('transactions')
    .insert({
      budget_id: budget.id,
      transaction_type: 'expense',
      amount: 200,
      description: 'Test purchase',
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

  console.log('3️⃣ Expense transaction created');
  console.log('   Transaction ID:', expenseTx.id);
  console.log('   Envelope balance: $' + envelopeAfterExpense.current_balance);

  // SOFT DELETE TEST
  console.log('\n🗑️  Testing soft delete...');

  // Method 1: Try RPC function
  console.log('\nMethod 1: Using RPC function');
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('soft_delete_transaction', {
      transaction_id: expenseTx.id
    });

  if (rpcError) {
    console.log('❌ RPC failed:', rpcError.message);
  } else {
    console.log('✅ RPC result:', rpcResult);
  }

  // Method 2: Direct update
  console.log('\nMethod 2: Direct UPDATE');
  const { data: updateResult, error: updateError } = await supabase
    .from('transactions')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: auth.user.id
    })
    .eq('id', expenseTx.id)
    .select()
    .single();

  if (updateError) {
    console.log('❌ Update failed:', updateError.message);
  } else {
    console.log('✅ Update successful');
    console.log('   is_deleted:', updateResult.is_deleted);
    console.log('   deleted_at:', updateResult.deleted_at);
  }

  // Check if trigger worked
  const { data: envelopeAfterDelete } = await supabase
    .from('envelopes')
    .select('current_balance')
    .eq('id', envelope.id)
    .single();

  console.log('\n📊 Balance check after soft delete:');
  console.log('   Before delete: $' + envelopeAfterExpense.current_balance);
  console.log('   After delete: $' + envelopeAfterDelete.current_balance);
  console.log('   Expected: $800 (expense reversed)');
  console.log('   Trigger worked:', envelopeAfterDelete.current_balance === '800' ? '✅ YES!' : '❌ NO');

  // Check audit log
  const { data: auditEvents } = await supabase
    .from('transaction_events')
    .select('event_type, old_values, new_values')
    .eq('transaction_id', expenseTx.id)
    .order('event_timestamp');

  console.log('\n📋 Audit log entries:', auditEvents.length);
  auditEvents.forEach((event, i) => {
    console.log(`   ${i + 1}. ${event.event_type}`);
    if (event.event_type === 'deleted') {
      console.log(`      is_deleted: ${event.old_values?.is_deleted} → ${event.new_values?.is_deleted}`);
    }
  });

  // Test restore
  console.log('\n♻️  Testing restore...');
  const { data: restoreResult, error: restoreError } = await supabase
    .from('transactions')
    .update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null
    })
    .eq('id', expenseTx.id)
    .select()
    .single();

  if (restoreError) {
    console.log('❌ Restore failed:', restoreError.message);
  } else {
    console.log('✅ Restore successful');
  }

  const { data: envelopeAfterRestore } = await supabase
    .from('envelopes')
    .select('current_balance')
    .eq('id', envelope.id)
    .single();

  console.log('   Envelope balance after restore: $' + envelopeAfterRestore.current_balance);
  console.log('   Expected: $600 (expense reapplied)');
  console.log('   Trigger worked:', envelopeAfterRestore.current_balance === '600' ? '✅ YES!' : '❌ NO');

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await supabase.from('transactions').delete().eq('budget_id', budget.id);
  await supabase.from('envelopes').delete().eq('budget_id', budget.id);
  await supabase.from('payees').delete().eq('budget_id', budget.id);
  await supabase.from('income_sources').delete().eq('budget_id', budget.id);
  await supabase.from('budgets').delete().eq('id', budget.id);

  // Sign out
  await supabase.auth.signOut();
  console.log('✅ Test complete!');
}

test().catch(console.error);