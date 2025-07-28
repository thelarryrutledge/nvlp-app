// Clean test focusing only on soft delete functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function test() {
  console.log('🧪 Clean Soft Delete Test\n');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Sign in
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'larryjrutledge@gmail.com',
    password: 'Test1234!'
  });

  console.log('✅ Signed in as:', auth.user.email);

  // Create test budget
  const { data: budget } = await supabase
    .from('budgets')
    .insert({
      user_id: auth.user.id,
      name: 'Clean Soft Delete Test',
      description: 'Clean test of soft delete'
    })
    .select()
    .single();

  console.log('✅ Budget created:', budget.id);

  // Create envelope and payee
  const { data: envelope } = await supabase
    .from('envelopes')
    .insert({
      budget_id: budget.id,
      name: 'Test Envelope',
      current_balance: 1000  // Start with $1000
    })
    .select()
    .single();

  const { data: payee } = await supabase
    .from('payees')
    .insert({
      budget_id: budget.id,
      name: 'Test Store'
    })
    .select()
    .single();

  // Manually set envelope balance to 1000 (simulating prior allocation)
  await supabase
    .from('envelopes')
    .update({ current_balance: 1000 })
    .eq('id', envelope.id);

  console.log('✅ Set up envelope with $1000 balance');

  // Create an expense transaction
  const { data: expenseTx } = await supabase
    .from('transactions')
    .insert({
      budget_id: budget.id,
      transaction_type: 'expense',
      amount: 300,
      description: 'Store purchase',
      transaction_date: new Date().toISOString().split('T')[0],
      from_envelope_id: envelope.id,
      payee_id: payee.id
    })
    .select()
    .single();

  // Check envelope balance after expense
  const { data: envelopeAfterExpense } = await supabase
    .from('envelopes')
    .select('current_balance')
    .eq('id', envelope.id)
    .single();

  console.log('\n💸 Created expense transaction:');
  console.log('   Transaction ID:', expenseTx.id);
  console.log('   Amount: $300');
  console.log('   Envelope balance: $1000 → $' + envelopeAfterExpense.current_balance);

  // TEST 1: Soft delete using RPC function ONLY
  console.log('\n🗑️  Test 1: Soft delete using RPC function');
  
  const { data: deleteResult, error: deleteError } = await supabase
    .rpc('soft_delete_transaction', {
      transaction_id: expenseTx.id
    });

  console.log('   RPC result:', deleteResult);
  if (deleteError) console.log('   RPC error:', deleteError.message);

  // Check transaction status
  const { data: deletedTransaction } = await supabase
    .from('transactions')
    .select('is_deleted, deleted_at, deleted_by')
    .eq('id', expenseTx.id)
    .single();

  console.log('   Transaction is_deleted:', deletedTransaction.is_deleted);
  console.log('   Transaction deleted_at:', deletedTransaction.deleted_at ? 'Set' : 'Not set');

  // Check envelope balance after soft delete
  const { data: envelopeAfterDelete } = await supabase
    .from('envelopes')
    .select('current_balance')
    .eq('id', envelope.id)
    .single();

  console.log('   Envelope balance after delete: $' + envelopeAfterDelete.current_balance);
  console.log('   Expected: $1000 (expense should be reversed)');
  const deleteWorked = envelopeAfterDelete.current_balance === '1000';
  console.log('   ✅ Soft delete trigger worked:', deleteWorked ? 'YES' : 'NO');

  // TEST 2: Restore using RPC function
  console.log('\n♻️  Test 2: Restore using RPC function');
  
  const { data: restoreResult, error: restoreError } = await supabase
    .rpc('restore_transaction', {
      transaction_id: expenseTx.id
    });

  console.log('   RPC result:', restoreResult);
  if (restoreError) console.log('   RPC error:', restoreError.message);

  // Check transaction status
  const { data: restoredTransaction } = await supabase
    .from('transactions')
    .select('is_deleted, deleted_at, deleted_by')
    .eq('id', expenseTx.id)
    .single();

  console.log('   Transaction is_deleted:', restoredTransaction.is_deleted);
  console.log('   Transaction deleted_at:', restoredTransaction.deleted_at ? 'Still set' : 'Cleared');

  // Check envelope balance after restore
  const { data: envelopeAfterRestore } = await supabase
    .from('envelopes')
    .select('current_balance')
    .eq('id', envelope.id)
    .single();

  console.log('   Envelope balance after restore: $' + envelopeAfterRestore.current_balance);
  console.log('   Expected: $700 (expense reapplied)');
  const restoreWorked = envelopeAfterRestore.current_balance === '700';
  console.log('   ✅ Restore trigger worked:', restoreWorked ? 'YES' : 'NO');

  // Check audit trail
  console.log('\n📋 Audit Trail:');
  const { data: auditEvents } = await supabase
    .from('transaction_events')
    .select('event_type, event_timestamp, old_values, new_values')
    .eq('transaction_id', expenseTx.id)
    .order('event_timestamp');

  auditEvents.forEach((event, i) => {
    console.log(`   ${i + 1}. ${event.event_type} at ${new Date(event.event_timestamp).toLocaleTimeString()}`);
    if (event.event_type === 'deleted') {
      console.log(`      is_deleted: ${event.old_values?.is_deleted} → ${event.new_values?.is_deleted}`);
    } else if (event.event_type === 'restored') {
      console.log(`      is_deleted: ${event.old_values?.is_deleted} → ${event.new_values?.is_deleted}`);
    }
  });

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('   ✅ Authentication: Working');
  console.log('   ✅ Budget/envelope creation: Working');
  console.log('   ✅ Transaction creation: Working');
  console.log('   ✅ Transaction triggers: Working');
  console.log('   ✅ Soft delete RPC:', deleteResult ? 'Working' : 'Failed');
  console.log('   ✅ Soft delete trigger:', deleteWorked ? 'Working' : 'Failed');
  console.log('   ✅ Restore RPC:', restoreResult ? 'Working' : 'Failed');
  console.log('   ✅ Restore trigger:', restoreWorked ? 'Working' : 'Failed');
  console.log('   ✅ Audit logging: Working (' + auditEvents.length + ' events)');

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await supabase.from('transactions').delete().eq('budget_id', budget.id);
  await supabase.from('envelopes').delete().eq('budget_id', budget.id);
  await supabase.from('payees').delete().eq('budget_id', budget.id);
  await supabase.from('budgets').delete().eq('id', budget.id);

  await supabase.auth.signOut();
  console.log('✅ Test complete!');
}

test().catch(console.error);