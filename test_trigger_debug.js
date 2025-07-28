// Debug why triggers aren't working for soft delete
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function test() {
  console.log('🔍 Debugging Trigger Behavior\n');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Sign in
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'larryjrutledge@gmail.com',
    password: 'Test1234!'
  });

  // Create test budget
  const { data: budget } = await supabase
    .from('budgets')
    .insert({
      user_id: auth.user.id,
      name: 'Trigger Debug Test'
    })
    .select()
    .single();

  // Create envelope
  const { data: envelope } = await supabase
    .from('envelopes')
    .insert({
      budget_id: budget.id,
      name: 'Debug Envelope'
    })
    .select()
    .single();

  // Manually set envelope balance 
  await supabase
    .from('envelopes')
    .update({ current_balance: 1000 })
    .eq('id', envelope.id);

  // Create payee
  const { data: payee } = await supabase
    .from('payees')
    .insert({
      budget_id: budget.id,
      name: 'Debug Store'
    })
    .select()
    .single();

  console.log('✅ Setup complete - envelope has $1000');

  // Create expense transaction
  const { data: expenseTx } = await supabase
    .from('transactions')
    .insert({
      budget_id: budget.id,
      transaction_type: 'expense',
      amount: 200,
      description: 'Debug expense',
      transaction_date: new Date().toISOString().split('T')[0],
      from_envelope_id: envelope.id,
      payee_id: payee.id
    })
    .select()
    .single();

  const { data: env1 } = await supabase
    .from('envelopes')
    .select('current_balance')
    .eq('id', envelope.id)
    .single();

  console.log('\n💸 After expense creation:');
  console.log('   Envelope balance:', env1.current_balance, '(expected: 800)');

  // Test direct UPDATE for soft delete (not RPC)
  console.log('\n🗑️  Testing direct UPDATE for soft delete...');
  
  const { data: updateResult } = await supabase
    .from('transactions')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: auth.user.id
    })
    .eq('id', expenseTx.id)
    .select()
    .single();

  console.log('   Update successful, is_deleted:', updateResult.is_deleted);

  const { data: env2 } = await supabase
    .from('envelopes')
    .select('current_balance')
    .eq('id', envelope.id)
    .single();

  console.log('   Envelope balance after direct soft delete:', env2.current_balance, '(expected: 1000)');
  console.log('   Direct update trigger worked:', env2.current_balance === '1000' ? 'YES' : 'NO');

  // Test direct UPDATE for restore
  console.log('\n♻️  Testing direct UPDATE for restore...');
  
  const { data: restoreResult } = await supabase
    .from('transactions')
    .update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null
    })
    .eq('id', expenseTx.id)
    .select()
    .single();

  console.log('   Restore successful, is_deleted:', restoreResult.is_deleted);

  const { data: env3 } = await supabase
    .from('envelopes')
    .select('current_balance')
    .eq('id', envelope.id)
    .single();

  console.log('   Envelope balance after direct restore:', env3.current_balance, '(expected: 800)');
  console.log('   Direct restore trigger worked:', env3.current_balance === '800' ? 'YES' : 'NO');

  // Check what events were logged
  const { data: events } = await supabase
    .from('transaction_events')
    .select('event_type, old_values, new_values')
    .eq('transaction_id', expenseTx.id)
    .order('event_timestamp');

  console.log('\n📋 Events logged:');
  events.forEach((event, i) => {
    console.log(`   ${i + 1}. ${event.event_type}`);
    if (event.old_values?.is_deleted !== event.new_values?.is_deleted) {
      console.log(`      is_deleted: ${event.old_values?.is_deleted} → ${event.new_values?.is_deleted}`);
    }
  });

  // Cleanup
  await supabase.from('transactions').delete().eq('budget_id', budget.id);
  await supabase.from('envelopes').delete().eq('budget_id', budget.id);
  await supabase.from('payees').delete().eq('budget_id', budget.id);
  await supabase.from('budgets').delete().eq('id', budget.id);

  await supabase.auth.signOut();
  console.log('\n✅ Debug complete!');
}

test().catch(console.error);