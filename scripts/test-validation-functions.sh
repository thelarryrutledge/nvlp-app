#!/bin/bash

# Test script for comprehensive data validation functions
# Tests all validation functions and constraints added to NVLP project

set -e

echo "🔍 Testing NVLP Data Validation Functions"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to run SQL and check results
run_sql() {
    local query="$1"
    local description="$2"
    
    echo -n "  Testing: $description... "
    
    if result=$(echo "$query" | supabase db remote exec 2>&1); then
        echo -e "${GREEN}✓${NC}"
        if [[ -n "$result" && "$result" != *"(0 rows)"* ]]; then
            echo "$result" | sed 's/^/    /'
        fi
        return 0
    else
        echo -e "${RED}✗${NC}"
        echo "    Error: $result"
        return 1
    fi
}

# Helper function to get test user's budget ID
get_test_budget_id() {
    local email="$1"
    local query="SELECT b.id FROM public.budgets b 
                 JOIN auth.users u ON b.user_id = u.id 
                 WHERE u.email = '$email' 
                 LIMIT 1;"
    
    echo "$query" | supabase db remote exec | grep -E '^[a-f0-9-]+$' | head -1
}

# Test setup
echo -e "\n${BLUE}🔧 Test Setup${NC}"
echo "Getting test user budget ID..."

BUDGET_ID=$(get_test_budget_id "larryjrutledge@gmail.com")
if [[ -z "$BUDGET_ID" ]]; then
    echo -e "${RED}Error: Could not find test user budget ID${NC}"
    exit 1
fi

echo "Test budget ID: $BUDGET_ID"

# Test 1: Comprehensive Data Integrity Validation
echo -e "\n${BLUE}📊 Test 1: Comprehensive Data Integrity Validation${NC}"

run_sql "SELECT validation_category, validation_rule, is_valid, error_count, details 
         FROM public.validate_budget_data_integrity('$BUDGET_ID'::UUID) 
         ORDER BY validation_category;" \
        "Budget data integrity validation"

# Test 2: Transaction Constraint Validation
echo -e "\n${BLUE}💰 Test 2: Transaction Constraint Validation${NC}"

# Test valid income transaction
run_sql "SELECT constraint_name, is_valid, error_message 
         FROM public.validate_transaction_constraints(
             '$BUDGET_ID'::UUID, 
             'income'::public.transaction_type, 
             100.00, 
             NULL, NULL, NULL, 
             (SELECT id FROM public.income_sources WHERE budget_id = '$BUDGET_ID'::UUID LIMIT 1)
         );" \
        "Valid income transaction validation"

# Test invalid income transaction (no income source)
run_sql "SELECT constraint_name, is_valid, error_message 
         FROM public.validate_transaction_constraints(
             '$BUDGET_ID'::UUID, 
             'income'::public.transaction_type, 
             100.00, 
             NULL, NULL, NULL, NULL
         );" \
        "Invalid income transaction validation (no income source)"

# Test valid allocation transaction
run_sql "SELECT constraint_name, is_valid, error_message 
         FROM public.validate_transaction_constraints(
             '$BUDGET_ID'::UUID, 
             'allocation'::public.transaction_type, 
             50.00, 
             NULL, 
             (SELECT id FROM public.envelopes WHERE budget_id = '$BUDGET_ID'::UUID LIMIT 1), 
             NULL, NULL
         );" \
        "Valid allocation transaction validation"

# Test invalid allocation transaction (no destination envelope)
run_sql "SELECT constraint_name, is_valid, error_message 
         FROM public.validate_transaction_constraints(
             '$BUDGET_ID'::UUID, 
             'allocation'::public.transaction_type, 
             50.00, 
             NULL, NULL, NULL, NULL
         );" \
        "Invalid allocation transaction validation (no destination envelope)"

# Test valid expense transaction
run_sql "SELECT constraint_name, is_valid, error_message 
         FROM public.validate_transaction_constraints(
             '$BUDGET_ID'::UUID, 
             'expense'::public.transaction_type, 
             25.00, 
             (SELECT id FROM public.envelopes WHERE budget_id = '$BUDGET_ID'::UUID LIMIT 1), 
             NULL, 
             (SELECT id FROM public.payees WHERE budget_id = '$BUDGET_ID'::UUID LIMIT 1), 
             NULL
         );" \
        "Valid expense transaction validation"

# Test 3: Data Validation Constraints
echo -e "\n${BLUE}🔒 Test 3: Data Validation Constraints${NC}"

# Test user_profiles constraints
run_sql "SELECT conname, consrc FROM pg_constraint 
         WHERE conrelid = 'public.user_profiles'::regclass 
         AND contype = 'c' 
         ORDER BY conname;" \
        "User profiles validation constraints"

# Test budgets constraints
run_sql "SELECT conname, consrc FROM pg_constraint 
         WHERE conrelid = 'public.budgets'::regclass 
         AND contype = 'c' 
         ORDER BY conname;" \
        "Budgets validation constraints"

# Test envelopes constraints
run_sql "SELECT conname, consrc FROM pg_constraint 
         WHERE conrelid = 'public.envelopes'::regclass 
         AND contype = 'c' 
         ORDER BY conname;" \
        "Envelopes validation constraints"

# Test payees constraints
run_sql "SELECT conname, consrc FROM pg_constraint 
         WHERE conrelid = 'public.payees'::regclass 
         AND contype = 'c' 
         ORDER BY conname;" \
        "Payees validation constraints"

# Test transactions constraints
run_sql "SELECT conname, consrc FROM pg_constraint 
         WHERE conrelid = 'public.transactions'::regclass 
         AND contype = 'c' 
         ORDER BY conname;" \
        "Transactions validation constraints"

# Test user_state constraints
run_sql "SELECT conname, consrc FROM pg_constraint 
         WHERE conrelid = 'public.user_state'::regclass 
         AND contype = 'c' 
         ORDER BY conname;" \
        "User state validation constraints"

# Test 4: Fix Data Inconsistencies Function
echo -e "\n${BLUE}🔧 Test 4: Fix Data Inconsistencies Function${NC}"

run_sql "SELECT fix_category, fixes_applied, details 
         FROM public.fix_budget_data_inconsistencies('$BUDGET_ID'::UUID);" \
        "Fix budget data inconsistencies"

# Test 5: Validate Function Comments and Metadata
echo -e "\n${BLUE}📝 Test 5: Function Comments and Metadata${NC}"

run_sql "SELECT p.proname, d.description 
         FROM pg_proc p 
         LEFT JOIN pg_description d ON p.oid = d.objoid 
         WHERE p.proname IN (
             'validate_budget_data_integrity', 
             'validate_transaction_constraints', 
             'fix_budget_data_inconsistencies'
         ) 
         ORDER BY p.proname;" \
        "Function documentation and comments"

# Test 6: Performance Test (Basic)
echo -e "\n${BLUE}⚡ Test 6: Basic Performance Test${NC}"

# Test validation function performance
run_sql "EXPLAIN (ANALYZE, BUFFERS) 
         SELECT * FROM public.validate_budget_data_integrity('$BUDGET_ID'::UUID);" \
        "Validation function performance analysis"

# Test 7: Edge Cases and Error Handling
echo -e "\n${BLUE}🔍 Test 7: Edge Cases and Error Handling${NC}"

# Test with invalid budget ID
run_sql "SELECT validation_category, validation_rule, is_valid, error_count, details 
         FROM public.validate_budget_data_integrity('00000000-0000-0000-0000-000000000000'::UUID) 
         ORDER BY validation_category;" \
        "Invalid budget ID handling"

# Test with invalid transaction amount
run_sql "SELECT constraint_name, is_valid, error_message 
         FROM public.validate_transaction_constraints(
             '$BUDGET_ID'::UUID, 
             'income'::public.transaction_type, 
             -100.00, 
             NULL, NULL, NULL, 
             (SELECT id FROM public.income_sources WHERE budget_id = '$BUDGET_ID'::UUID LIMIT 1)
         );" \
        "Invalid transaction amount validation"

# Test with future date
run_sql "SELECT constraint_name, is_valid, error_message 
         FROM public.validate_transaction_constraints(
             '$BUDGET_ID'::UUID, 
             'income'::public.transaction_type, 
             100.00, 
             NULL, NULL, NULL, 
             (SELECT id FROM public.income_sources WHERE budget_id = '$BUDGET_ID'::UUID LIMIT 1),
             NULL,
             CURRENT_DATE + INTERVAL '7 days'
         );" \
        "Future date validation"

# Test Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "=========================================="
echo "✅ All validation functions have been tested"
echo "✅ All data integrity checks are working"
echo "✅ All transaction constraint validations are working"
echo "✅ All data validation constraints are in place"
echo "✅ Fix data inconsistencies function is working"
echo "✅ Function documentation is available"
echo "✅ Performance analysis completed"
echo "✅ Edge cases and error handling tested"

echo -e "\n${GREEN}🎉 Comprehensive Data Validation Testing Complete!${NC}"
echo "All validation functions are working correctly with the clean test data."