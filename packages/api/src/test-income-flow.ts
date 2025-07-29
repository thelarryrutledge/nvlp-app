/**
 * Simple test to verify income transaction flow
 */

import { TransactionService } from './services/transaction.service';
import { createClient } from '@supabase/supabase-js';

// Create a simple test
async function testIncomeFlow() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    return;
  }

  console.log('🧪 Testing Income Transaction Flow\n');
  
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Sign in with test user
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: 'larryjrutledge@gmail.com',
    password: 'Test1234!',
  });

  if (authError || !authData.user) {
    console.error('Failed to sign in:', authError);
    return;
  }

  console.log(`✓ Signed in as test user: ${authData.user.id}`);

  // Create a budget
  const { data: budget, error: budgetError } = await client
    .from('budgets')
    .insert({
      user_id: authData.user.id,
      name: 'Income Flow Test Budget',
      description: 'Testing income transaction flow',
      currency: 'USD',
    })
    .select()
    .single();

  if (budgetError || !budget) {
    console.error('Failed to create budget:', budgetError);
    return;
  }

  console.log(`✓ Created budget with available: $${budget.available_amount}`);

  // Create income source
  const { data: incomeSource, error: incomeError } = await client
    .from('income_sources')
    .insert({
      budget_id: budget.id,
      name: 'Test Salary',
      expected_amount: 5000,
      frequency: 'monthly',
      next_expected_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (incomeError || !incomeSource) {
    console.error('Failed to create income source:', incomeError);
    return;
  }

  console.log(`✓ Created income source: ${incomeSource.name}`);

  // Create income transaction
  const incomeAmount = 3500;
  const { data: transaction, error: transError } = await client
    .from('transactions')
    .insert({
      budget_id: budget.id,
      transaction_type: 'income',
      amount: incomeAmount,
      transaction_date: new Date().toISOString().split('T')[0],
      description: 'Test salary payment',
      income_source_id: incomeSource.id,
      is_cleared: true,
    })
    .select()
    .single();

  if (transError || !transaction) {
    console.error('Failed to create transaction:', transError);
    return;
  }

  console.log(`✓ Created income transaction for $${incomeAmount}`);

  // Check updated budget
  const { data: updated, error: updateError } = await client
    .from('budgets')
    .select('available_amount')
    .eq('id', budget.id)
    .single();

  if (updateError || !updated) {
    console.error('Failed to fetch updated budget:', updateError);
    return;
  }

  console.log(`\n💰 Results:`);
  console.log(`  Initial available: $${budget.available_amount}`);
  console.log(`  After income:      $${updated.available_amount}`);
  console.log(`  Expected:          $${budget.available_amount + incomeAmount}`);

  if (updated.available_amount === budget.available_amount + incomeAmount) {
    console.log('\n✅ SUCCESS: Income flow working correctly!');
  } else {
    console.log('\n❌ FAIL: Income amount not updated correctly');
  }

  // Cleanup
  await client.from('transactions').delete().eq('id', transaction.id);
  await client.from('income_sources').delete().eq('id', incomeSource.id); 
  await client.from('budgets').delete().eq('id', budget.id);
  
  console.log('\n✨ Test complete and cleaned up');
}

// Run test
testIncomeFlow().catch(console.error);