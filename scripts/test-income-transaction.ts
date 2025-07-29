#!/usr/bin/env tsx

/**
 * Test script to verify income transaction flow
 * This demonstrates that income transactions automatically increase budget available_amount
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testIncomeTransaction() {
  try {
    console.log('🧪 Testing Income Transaction Flow\n');

    // Step 1: Get a test user and budget
    const { data: users, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('No test users found. Please run auth tests first.');
      return;
    }

    const userId = users[0].user_id;
    console.log(`✓ Using test user: ${userId}`);

    // Get or create a test budget
    let { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    let budgetId: string;
    let initialAvailable: number;

    if (budgetError || !budgets || budgets.length === 0) {
      // Create a test budget
      const { data: newBudget, error: createError } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          name: 'Income Test Budget',
          description: 'Testing income transaction flow',
          currency: 'USD',
        })
        .select()
        .single();

      if (createError || !newBudget) {
        console.error('Failed to create test budget:', createError);
        return;
      }

      budgetId = newBudget.id;
      initialAvailable = newBudget.available_amount;
      console.log(`✓ Created test budget: ${budgetId}`);
    } else {
      budgetId = budgets[0].id;
      initialAvailable = budgets[0].available_amount;
      console.log(`✓ Using existing budget: ${budgetId}`);
    }

    console.log(`  Initial available amount: $${initialAvailable.toFixed(2)}\n`);

    // Step 2: Create an income source
    const { data: incomeSource, error: incomeError } = await supabase
      .from('income_sources')
      .insert({
        budget_id: budgetId,
        name: 'Test Salary',
        amount: 5000.00,
        frequency: 'monthly',
        next_expected_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (incomeError || !incomeSource) {
      console.error('Failed to create income source:', incomeError);
      return;
    }

    console.log(`✓ Created income source: ${incomeSource.name} ($${incomeSource.amount})`);

    // Step 3: Create an income transaction
    const incomeAmount = 3500.00;
    console.log(`\n📥 Creating income transaction for $${incomeAmount}...`);

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        budget_id: budgetId,
        transaction_type: 'income',
        amount: incomeAmount,
        transaction_date: new Date().toISOString().split('T')[0],
        description: 'Monthly salary payment',
        income_source_id: incomeSource.id,
        is_cleared: true,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      console.error('Failed to create income transaction:', transactionError);
      return;
    }

    console.log(`✓ Created income transaction: ${transaction.id}`);

    // Step 4: Verify budget available_amount was updated
    const { data: updatedBudget, error: fetchError } = await supabase
      .from('budgets')
      .select('available_amount')
      .eq('id', budgetId)
      .single();

    if (fetchError || !updatedBudget) {
      console.error('Failed to fetch updated budget:', fetchError);
      return;
    }

    const expectedAvailable = initialAvailable + incomeAmount;
    console.log(`\n💰 Budget Available Amount:`);
    console.log(`  Before income: $${initialAvailable.toFixed(2)}`);
    console.log(`  After income:  $${updatedBudget.available_amount.toFixed(2)}`);
    console.log(`  Expected:      $${expectedAvailable.toFixed(2)}`);

    if (updatedBudget.available_amount === expectedAvailable) {
      console.log(`\n✅ SUCCESS: Income transaction correctly increased available amount!`);
    } else {
      console.log(`\n❌ ERROR: Available amount mismatch!`);
    }

    // Step 5: Test soft delete reversal
    console.log(`\n🔄 Testing soft delete reversal...`);

    const { error: deleteError } = await supabase
      .from('transactions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', transaction.id);

    if (deleteError) {
      console.error('Failed to soft delete transaction:', deleteError);
      return;
    }

    const { data: afterDelete, error: afterDeleteError } = await supabase
      .from('budgets')
      .select('available_amount')
      .eq('id', budgetId)
      .single();

    if (afterDeleteError || !afterDelete) {
      console.error('Failed to fetch budget after delete:', afterDeleteError);
      return;
    }

    console.log(`  After soft delete: $${afterDelete.available_amount.toFixed(2)}`);

    if (afterDelete.available_amount === initialAvailable) {
      console.log(`✅ Soft delete correctly reversed the income amount`);
    } else {
      console.log(`❌ Soft delete did not properly reverse the amount`);
    }

    // Cleanup
    await supabase.from('transactions').delete().eq('id', transaction.id);
    await supabase.from('income_sources').delete().eq('id', incomeSource.id);

    console.log(`\n✨ Income transaction flow test completed!`);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testIncomeTransaction();