#!/bin/bash

# Transaction Flow Test Script
# Tests the complete money flow in NVLP: Income → Allocation → Expense → Transfer

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-your-anon-key}"
USER_ACCESS_TOKEN="${USER_ACCESS_TOKEN:-}"

# Test data IDs (these would be set from actual test data)
BUDGET_ID="${BUDGET_ID:-}"
INCOME_SOURCE_ID="${INCOME_SOURCE_ID:-}"
INCOME_CATEGORY_ID="${INCOME_CATEGORY_ID:-}"
GROCERY_ENVELOPE_ID="${GROCERY_ENVELOPE_ID:-}"
SAVINGS_ENVELOPE_ID="${SAVINGS_ENVELOPE_ID:-}"
RENT_ENVELOPE_ID="${RENT_ENVELOPE_ID:-}"
WALMART_PAYEE_ID="${WALMART_PAYEE_ID:-}"
GROCERY_CATEGORY_ID="${GROCERY_CATEGORY_ID:-}"

echo -e "${BLUE}💰 NVLP Transaction Flow Test${NC}"
echo "========================================"

# Check prerequisites
if [ -z "$USER_ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Error: USER_ACCESS_TOKEN not set${NC}"
    echo "Please authenticate first and set the token"
    exit 1
fi

if [ -z "$BUDGET_ID" ]; then
    echo -e "${YELLOW}⚠️  Warning: Test data IDs not set${NC}"
    echo "This script requires existing test data (budget, envelopes, etc.)"
    echo "Run budget setup first or set the required IDs"
fi

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$endpoint" \
            -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "$endpoint" \
            -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
            -H "apikey: $SUPABASE_ANON_KEY"
    fi
}

# Helper to pretty print JSON
pretty_json() {
    echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
}

# Helper to extract field from JSON
extract_json_field() {
    local json=$1
    local field=$2
    echo "$json" | grep -o "\"$field\":[^,}]*" | cut -d':' -f2 | tr -d ' "' || echo "0"
}

echo -e "\n${CYAN}📊 Initial State${NC}"
echo "----------------------------------------"

# Get initial budget state
initial_budget=$(api_call GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID")
initial_available=$(extract_json_field "$initial_budget" "available_amount")
echo "Budget Available Amount: \$$initial_available"

# Get initial envelope balances
if [ -n "$GROCERY_ENVELOPE_ID" ]; then
    grocery_envelope=$(api_call GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$GROCERY_ENVELOPE_ID")
    initial_grocery_balance=$(extract_json_field "$grocery_envelope" "current_balance")
    echo "Grocery Envelope Balance: \$$initial_grocery_balance"
fi

echo -e "\n${BLUE}Step 1: Income Transaction${NC}"
echo "----------------------------------------"
echo "Recording income of \$1,500.00..."

income_response=$(api_call POST "$SUPABASE_URL/functions/v1/transactions" '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "income",
    "amount": 1500.00,
    "description": "Monthly salary payment",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "income_source_id": "'$INCOME_SOURCE_ID'",
    "category_id": "'$INCOME_CATEGORY_ID'"
}')

income_id=$(extract_json_field "$income_response" "id")

if echo "$income_response" | grep -q "error"; then
    echo -e "${RED}❌ Failed to create income transaction${NC}"
    pretty_json "$income_response"
else
    echo -e "${GREEN}✅ Income transaction created${NC}"
    echo "Transaction ID: $income_id"
    
    # Check budget available increased
    new_budget=$(api_call GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID")
    new_available=$(extract_json_field "$new_budget" "available_amount")
    echo "New Available Amount: \$$new_available"
    
    # Calculate difference
    increase=$(echo "$new_available - $initial_available" | bc 2>/dev/null || echo "N/A")
    echo -e "${GREEN}Available increased by: \$$increase${NC}"
fi

echo -e "\n${BLUE}Step 2: Allocation Transactions${NC}"
echo "----------------------------------------"
echo "Allocating funds to envelopes..."

# Allocate to groceries
echo -e "\n${YELLOW}Allocating \$400 to Groceries...${NC}"
grocery_alloc=$(api_call POST "$SUPABASE_URL/functions/v1/transactions" '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "allocation",
    "amount": 400.00,
    "description": "Monthly grocery budget",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "to_envelope_id": "'$GROCERY_ENVELOPE_ID'"
}')

if echo "$grocery_alloc" | grep -q "error"; then
    echo -e "${RED}❌ Failed to allocate to groceries${NC}"
    pretty_json "$grocery_alloc"
else
    echo -e "${GREEN}✅ Allocated to groceries${NC}"
fi

# Allocate to savings
echo -e "\n${YELLOW}Allocating \$500 to Savings...${NC}"
savings_alloc=$(api_call POST "$SUPABASE_URL/functions/v1/transactions" '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "allocation",
    "amount": 500.00,
    "description": "Emergency fund contribution",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "to_envelope_id": "'$SAVINGS_ENVELOPE_ID'"
}')

if echo "$savings_alloc" | grep -q "error"; then
    echo -e "${RED}❌ Failed to allocate to savings${NC}"
    pretty_json "$savings_alloc"
else
    echo -e "${GREEN}✅ Allocated to savings${NC}"
fi

# Allocate to rent
echo -e "\n${YELLOW}Allocating \$300 to Rent...${NC}"
rent_alloc=$(api_call POST "$SUPABASE_URL/functions/v1/transactions" '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "allocation",
    "amount": 300.00,
    "description": "Rent budget",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "to_envelope_id": "'$RENT_ENVELOPE_ID'"
}')

if echo "$rent_alloc" | grep -q "error"; then
    echo -e "${RED}❌ Failed to allocate to rent${NC}"
    pretty_json "$rent_alloc"
else
    echo -e "${GREEN}✅ Allocated to rent${NC}"
fi

echo -e "\n${CYAN}📊 Post-Allocation State${NC}"
echo "----------------------------------------"

# Check budget available after allocations
post_alloc_budget=$(api_call GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID")
post_alloc_available=$(extract_json_field "$post_alloc_budget" "available_amount")
echo "Budget Available Amount: \$$post_alloc_available"
echo "Total Allocated: \$1,200.00"
echo "Remaining Available: \$$post_alloc_available"

# Check envelope balances
if [ -n "$GROCERY_ENVELOPE_ID" ]; then
    grocery_envelope=$(api_call GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$GROCERY_ENVELOPE_ID")
    grocery_balance=$(extract_json_field "$grocery_envelope" "current_balance")
    echo "Grocery Envelope Balance: \$$grocery_balance"
fi

echo -e "\n${BLUE}Step 3: Expense Transaction${NC}"
echo "----------------------------------------"
echo "Recording grocery expense of \$125.50..."

expense_response=$(api_call POST "$SUPABASE_URL/functions/v1/transactions" '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "expense",
    "amount": 125.50,
    "description": "Weekly groceries",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "from_envelope_id": "'$GROCERY_ENVELOPE_ID'",
    "payee_id": "'$WALMART_PAYEE_ID'",
    "category_id": "'$GROCERY_CATEGORY_ID'"
}')

if echo "$expense_response" | grep -q "error"; then
    echo -e "${RED}❌ Failed to create expense${NC}"
    pretty_json "$expense_response"
else
    echo -e "${GREEN}✅ Expense transaction created${NC}"
    
    # Check envelope balance decreased
    if [ -n "$GROCERY_ENVELOPE_ID" ]; then
        grocery_envelope=$(api_call GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$GROCERY_ENVELOPE_ID")
        new_grocery_balance=$(extract_json_field "$grocery_envelope" "current_balance")
        echo "Grocery Envelope New Balance: \$$new_grocery_balance"
        
        spent=$(echo "$grocery_balance - $new_grocery_balance" | bc 2>/dev/null || echo "N/A")
        echo -e "${GREEN}Spent from envelope: \$$spent${NC}"
    fi
fi

echo -e "\n${BLUE}Step 4: Transfer Transaction${NC}"
echo "----------------------------------------"
echo "Transferring \$50 from Groceries to Savings..."

transfer_response=$(api_call POST "$SUPABASE_URL/functions/v1/transactions" '{
    "budget_id": "'$BUDGET_ID'",
    "transaction_type": "transfer",
    "amount": 50.00,
    "description": "Move excess to savings",
    "transaction_date": "'$(date +%Y-%m-%d)'",
    "from_envelope_id": "'$GROCERY_ENVELOPE_ID'",
    "to_envelope_id": "'$SAVINGS_ENVELOPE_ID'"
}')

if echo "$transfer_response" | grep -q "error"; then
    echo -e "${RED}❌ Failed to create transfer${NC}"
    pretty_json "$transfer_response"
else
    echo -e "${GREEN}✅ Transfer transaction created${NC}"
fi

echo -e "\n${CYAN}📊 Final State${NC}"
echo "----------------------------------------"

# Get final budget state
final_budget=$(api_call GET "$SUPABASE_URL/rest/v1/budgets?id=eq.$BUDGET_ID")
final_available=$(extract_json_field "$final_budget" "available_amount")
echo "Budget Available Amount: \$$final_available"

# Get final envelope balances
if [ -n "$GROCERY_ENVELOPE_ID" ]; then
    grocery_envelope=$(api_call GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$GROCERY_ENVELOPE_ID")
    final_grocery_balance=$(extract_json_field "$grocery_envelope" "current_balance")
    echo "Grocery Envelope Balance: \$$final_grocery_balance"
fi

if [ -n "$SAVINGS_ENVELOPE_ID" ]; then
    savings_envelope=$(api_call GET "$SUPABASE_URL/rest/v1/envelopes?id=eq.$SAVINGS_ENVELOPE_ID")
    final_savings_balance=$(extract_json_field "$savings_envelope" "current_balance")
    echo "Savings Envelope Balance: \$$final_savings_balance"
fi

echo -e "\n${BLUE}Step 5: Transaction History${NC}"
echo "----------------------------------------"
echo "Fetching recent transactions..."

recent_transactions=$(api_call GET "$SUPABASE_URL/rest/v1/transactions?budget_id=eq.$BUDGET_ID&transaction_date=eq.$(date +%Y-%m-%d)&order=created_at.desc&limit=10")

echo "Today's Transactions:"
pretty_json "$recent_transactions"

echo -e "\n${BLUE}Step 6: Dashboard View${NC}"
echo "----------------------------------------"
echo "Getting dashboard summary..."

dashboard_response=$(api_call GET "$SUPABASE_URL/functions/v1/dashboard?budget_id=$BUDGET_ID")

if echo "$dashboard_response" | grep -q "error"; then
    echo -e "${YELLOW}⚠️  Dashboard endpoint may not be available${NC}"
else
    echo "Dashboard Data:"
    pretty_json "$dashboard_response"
fi

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}📈 Transaction Flow Summary${NC}"
echo "============================================"

echo -e "\n${GREEN}Money Flow:${NC}"
echo "1. Income: +\$1,500.00 → Available Pool"
echo "2. Allocations: -\$1,200.00 → Envelopes"
echo "   - Groceries: +\$400.00"
echo "   - Savings: +\$500.00"
echo "   - Rent: +\$300.00"
echo "3. Expense: -\$125.50 from Groceries"
echo "4. Transfer: -\$50.00 from Groceries → +\$50.00 to Savings"

echo -e "\n${GREEN}Expected Balances:${NC}"
echo "- Available: \$300.00 (1500 - 1200)"
echo "- Groceries: \$224.50 (400 - 125.50 - 50)"
echo "- Savings: \$550.00 (500 + 50)"
echo "- Rent: \$300.00"

echo -e "\n${CYAN}Actual Balances:${NC}"
echo "- Available: \$$final_available"
echo "- Groceries: \$$final_grocery_balance"
echo "- Savings: \$$final_savings_balance"

# Validation
echo -e "\n${BLUE}Validation:${NC}"

validate_balance() {
    local name=$1
    local expected=$2
    local actual=$3
    
    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✅ $name balance correct${NC}"
    else
        echo -e "${RED}❌ $name balance mismatch (expected: \$$expected, actual: \$$actual)${NC}"
    fi
}

# Only validate if we have the expected values
if [ -n "$final_available" ] && [ "$final_available" != "0" ]; then
    validate_balance "Available" "300.00" "$final_available"
fi

echo -e "\n${GREEN}🎉 Transaction flow test complete!${NC}"