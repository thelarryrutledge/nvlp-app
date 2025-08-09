#!/bin/bash

# Test script for category display_order functionality
# This script tests both auto-assignment and conflict resolution

API_URL="http://localhost:3000"
BUDGET_ID="your-budget-id-here"  # Replace with actual budget ID
AUTH_TOKEN="your-auth-token-here"  # Replace with actual auth token

echo "Testing Category Display Order Functionality"
echo "============================================"

# Function to create a category
create_category() {
  local name=$1
  local display_order=$2
  local data="{\"name\": \"$name\""
  
  if [ ! -z "$display_order" ]; then
    data="$data, \"display_order\": $display_order"
  fi
  
  data="$data}"
  
  echo "Creating category: $name (display_order: ${display_order:-auto})"
  curl -X POST "$API_URL/api/budgets/$BUDGET_ID/categories" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data" \
    -s | jq '.name, .display_order'
}

# Function to list categories with display order
list_categories() {
  echo -e "\nCurrent categories:"
  curl -X GET "$API_URL/api/budgets/$BUDGET_ID/categories" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -s | jq -r '.[] | "\(.name): display_order=\(.display_order)"' | sort -t= -k2 -n
}

echo -e "\n1. Testing auto-assignment of display_order"
echo "---------------------------------------------"
create_category "Test Category 1"
create_category "Test Category 2"
create_category "Test Category 3"
list_categories

echo -e "\n2. Testing insertion with existing display_order"
echo "-------------------------------------------------"
echo "Inserting category with display_order=1 (should shift others)"
create_category "Inserted Category" 1
list_categories

echo -e "\n3. Testing insertion at beginning"
echo "----------------------------------"
echo "Inserting category with display_order=0 (should shift all others)"
create_category "First Category" 0
list_categories

echo -e "\n4. Testing update with display_order change"
echo "--------------------------------------------"
echo "To test updates, you'll need to:"
echo "1. Get the ID of a category"
echo "2. Update it with a new display_order"
echo "3. Verify that other categories shifted appropriately"

echo -e "\nExample update command:"
echo 'curl -X PATCH "$API_URL/api/categories/{category-id}" \'
echo '  -H "Authorization: Bearer $AUTH_TOKEN" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d "{\"display_order\": 2}"'