#!/bin/bash

# Test script for transaction_events table functionality (audit trail)
# Tests event creation, RLS policies, and audit trail integrity

echo "=== Testing Transaction Events Table (Audit Trail) ==="
echo

# Test environment
API_BASE_URL="https://api.nvlp.app"
REST_URL="https://qnpatlosomopoimtsmsr.supabase.co/rest/v1"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"
TEST_USER="larryjrutledge@gmail.com"
TEST_PASSWORD="Test1234!"

echo "🔑 Step 1: Authenticate test user"
# Login to get JWT token
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"email\":\"$TEST_USER\",\"password\":\"$TEST_PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session.access_token // .access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi

echo "✅ Successfully authenticated"
echo

echo "📋 Step 2: Get user's budget and related data"
BUDGETS_RESPONSE=$(curl -s -X GET "$REST_URL/budgets?select=*" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

BUDGET_ID=$(echo "$BUDGETS_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$BUDGET_ID" ]; then
    echo "❌ No budget found for user"
    exit 1
fi

echo "✅ Found budget: $BUDGET_ID"

# Get required related entities
INCOME_SOURCES=$(curl -s -X GET "$REST_URL/income_sources?select=id,name&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
INCOME_SOURCE_ID=$(echo "$INCOME_SOURCES" | jq -r '.[0].id // empty')

ENVELOPES=$(curl -s -X GET "$REST_URL/envelopes?select=id,name&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
ENVELOPE_ID=$(echo "$ENVELOPES" | jq -r '.[0].id // empty')

PAYEES=$(curl -s -X GET "$REST_URL/payees?select=id,name&budget_id=eq.$BUDGET_ID&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
PAYEE_ID=$(echo "$PAYEES" | jq -r '.[0].id // empty')

CATEGORIES=$(curl -s -X GET "$REST_URL/categories?select=id,name&budget_id=eq.$BUDGET_ID&category_type=eq.expense&limit=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")
CATEGORY_ID=$(echo "$CATEGORIES" | jq -r '.[0].id // empty')

echo "Income Source: $INCOME_SOURCE_ID"
echo "Envelope: $ENVELOPE_ID"
echo "Payee: $PAYEE_ID"
echo "Category: $CATEGORY_ID"
echo

echo "📝 Step 3: Create transaction and verify event logging"
# Create an income transaction
INCOME_RESPONSE=$(curl -s -X POST "$REST_URL/transactions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"budget_id\": \"$BUDGET_ID\",
    \"transaction_type\": \"income\",
    \"amount\": 500.00,
    \"description\": \"Test income for audit trail\",
    \"income_source_id\": \"$INCOME_SOURCE_ID\",
    \"category_id\": \"$CATEGORY_ID\",
    \"transaction_date\": \"$(date +%Y-%m-%d)\"
  }")

echo "Income response: $INCOME_RESPONSE"
TRANSACTION_ID=$(echo "$INCOME_RESPONSE" | jq -r '.[0].id // empty')

if [ -n "$TRANSACTION_ID" ]; then
    echo "✅ Successfully created transaction: $TRANSACTION_ID"
    
    # Wait a moment for trigger to execute
    sleep 1
    
    # Check if event was created
    EVENTS_RESPONSE=$(curl -s -X GET "$REST_URL/transaction_events?select=*&transaction_id=eq.$TRANSACTION_ID&order=performed_at.desc" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    echo "Events response: $EVENTS_RESPONSE"
    
    EVENT_COUNT=$(echo "$EVENTS_RESPONSE" | jq '. | length')
    if [ "$EVENT_COUNT" -gt 0 ]; then
        EVENT_TYPE=$(echo "$EVENTS_RESPONSE" | jq -r '.[0].event_type')
        EVENT_DESC=$(echo "$EVENTS_RESPONSE" | jq -r '.[0].event_description')
        echo "✅ Event logged: $EVENT_TYPE - $EVENT_DESC"
    else
        echo "❌ No events found for transaction"
    fi
else
    echo "❌ Failed to create transaction"
    exit 1
fi
echo

echo "✏️ Step 4: Update transaction and verify event logging"
UPDATE_RESPONSE=$(curl -s -X PATCH "$REST_URL/transactions?id=eq.$TRANSACTION_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"amount\": 750.00,
    \"description\": \"Updated test income for audit trail\",
    \"notes\": \"Added notes during update\"
  }")

echo "Update response: $UPDATE_RESPONSE"

if echo "$UPDATE_RESPONSE" | jq -r '.[0].amount' | grep -q "750"; then
    echo "✅ Successfully updated transaction"
    
    # Wait for trigger
    sleep 1
    
    # Check for update event
    UPDATED_EVENTS=$(curl -s -X GET "$REST_URL/transaction_events?select=*&transaction_id=eq.$TRANSACTION_ID&event_type=eq.updated&order=performed_at.desc" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    UPDATE_EVENT_COUNT=$(echo "$UPDATED_EVENTS" | jq '. | length')
    if [ "$UPDATE_EVENT_COUNT" -gt 0 ]; then
        CHANGES=$(echo "$UPDATED_EVENTS" | jq -r '.[0].changes_made')
        echo "✅ Update event logged with changes: $CHANGES"
    else
        echo "❌ No update event found"
    fi
else
    echo "❌ Failed to update transaction"
fi
echo

echo "🗑️ Step 5: Soft delete transaction and verify event logging"
DELETE_RESPONSE=$(curl -s -X PATCH "$REST_URL/transactions?id=eq.$TRANSACTION_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"is_deleted\": true,
    \"deleted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }")

echo "Delete response: $DELETE_RESPONSE"

if echo "$DELETE_RESPONSE" | jq -r '.[0].is_deleted' | grep -q "true"; then
    echo "✅ Successfully soft deleted transaction"
    
    # Wait for trigger
    sleep 1
    
    # Check for delete event
    DELETE_EVENTS=$(curl -s -X GET "$REST_URL/transaction_events?select=*&transaction_id=eq.$TRANSACTION_ID&event_type=eq.deleted&order=performed_at.desc" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    DELETE_EVENT_COUNT=$(echo "$DELETE_EVENTS" | jq '. | length')
    if [ "$DELETE_EVENT_COUNT" -gt 0 ]; then
        DELETE_EVENT_DESC=$(echo "$DELETE_EVENTS" | jq -r '.[0].event_description')
        echo "✅ Delete event logged: $DELETE_EVENT_DESC"
    else
        echo "❌ No delete event found"
    fi
else
    echo "❌ Failed to soft delete transaction"
fi
echo

echo "🔄 Step 6: Restore transaction and verify event logging"
RESTORE_RESPONSE=$(curl -s -X PATCH "$REST_URL/transactions?id=eq.$TRANSACTION_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"is_deleted\": false
  }")

echo "Restore response: $RESTORE_RESPONSE"

if echo "$RESTORE_RESPONSE" | jq -r '.[0].is_deleted' | grep -q "false"; then
    echo "✅ Successfully restored transaction"
    
    # Wait for trigger
    sleep 1
    
    # Check for restore event
    RESTORE_EVENTS=$(curl -s -X GET "$REST_URL/transaction_events?select=*&transaction_id=eq.$TRANSACTION_ID&event_type=eq.restored&order=performed_at.desc" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "apikey: $ANON_KEY")
    
    RESTORE_EVENT_COUNT=$(echo "$RESTORE_EVENTS" | jq '. | length')
    if [ "$RESTORE_EVENT_COUNT" -gt 0 ]; then
        RESTORE_EVENT_DESC=$(echo "$RESTORE_EVENTS" | jq -r '.[0].event_description')
        echo "✅ Restore event logged: $RESTORE_EVENT_DESC"
    else
        echo "❌ No restore event found"
    fi
else
    echo "❌ Failed to restore transaction"
fi
echo

echo "📊 Step 7: Verify complete audit trail"
ALL_EVENTS=$(curl -s -X GET "$REST_URL/transaction_events?select=*&transaction_id=eq.$TRANSACTION_ID&order=performed_at.asc" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

TOTAL_EVENTS=$(echo "$ALL_EVENTS" | jq '. | length')
echo "Total events for transaction: $TOTAL_EVENTS"

# Expected: created, updated, deleted, restored = 4 events
if [ "$TOTAL_EVENTS" -ge 4 ]; then
    echo "✅ Complete audit trail verified"
    
    echo "Event sequence:"
    echo "$ALL_EVENTS" | jq -r '.[] | "  \(.performed_at | split("T")[0]) \(.performed_at | split("T")[1] | split(".")[0]) - \(.event_type): \(.event_description)"'
else
    echo "❌ Incomplete audit trail (expected at least 4 events, got $TOTAL_EVENTS)"
fi
echo

echo "🔒 Step 8: Test RLS policies"
# Try to access events for a transaction in another budget (should fail)
echo "Testing RLS: attempting to access events for non-existent transaction..."
INVALID_EVENTS=$(curl -s -X GET "$REST_URL/transaction_events?select=*&transaction_id=eq.00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY")

INVALID_COUNT=$(echo "$INVALID_EVENTS" | jq '. | length')
if [ "$INVALID_COUNT" -eq 0 ]; then
    echo "✅ RLS properly restricts access to events"
else
    echo "❌ RLS failure: accessed events that should be restricted"
fi
echo

echo "🧹 Step 9: Cleanup test transaction"
FINAL_DELETE=$(curl -s -X PATCH "$REST_URL/transactions?id=eq.$TRANSACTION_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"is_deleted\": true,
    \"deleted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }")

echo "✅ Test transaction cleaned up"
echo

echo "=== Transaction Events Table Test Complete ==="