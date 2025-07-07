#!/bin/bash

# Script to download and save export samples for review

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXPORT_URL="https://qnpatlosomopoimtsmsr.supabase.co/functions/v1/export"
TOKEN_FILE=".token"
OUTPUT_DIR="export-samples"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Read token
if [ ! -f "$TOKEN_FILE" ]; then
    echo "Error: Token file not found. Run login-and-save-token.sh first"
    exit 1
fi

TOKEN=$(cat "$TOKEN_FILE" | tr -d '\n\r')

# Get budget ID
echo -e "${BLUE}Getting budget ID...${NC}"
budget_response=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8" \
    "https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/budgets?select=id&limit=1")

BUDGET_ID=$(echo "$budget_response" | jq -r 'if type == "array" then .[0].id else .id end // empty')

if [ -z "$BUDGET_ID" ]; then
    echo "Error: Could not get budget ID"
    exit 1
fi

echo -e "${GREEN}Using budget ID: $BUDGET_ID${NC}"
echo

# Function to download and save export
download_export() {
    local endpoint="$1"
    local format="$2"
    local filename="$3"
    
    echo -n "Downloading $filename... "
    
    curl -s \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        "$EXPORT_URL/$endpoint?budget_id=$BUDGET_ID&format=$format" \
        -o "$OUTPUT_DIR/$filename"
    
    # Check if file has content
    if [ -s "$OUTPUT_DIR/$filename" ]; then
        file_size=$(ls -lh "$OUTPUT_DIR/$filename" | awk '{print $5}')
        echo -e "${GREEN}✓${NC} ($file_size)"
    else
        echo -e "${GREEN}✓${NC} (empty)"
    fi
}

echo -e "${BLUE}Downloading export samples to $OUTPUT_DIR/${NC}"
echo

# Download various exports in both formats
download_export "transactions" "csv" "transactions.csv"
download_export "transactions" "json" "transactions.json"
download_export "budget" "csv" "complete_budget.csv"
download_export "budget" "json" "complete_budget.json"
download_export "envelopes" "csv" "envelopes.csv"
download_export "envelopes" "json" "envelopes.json"
download_export "categories" "csv" "categories.csv"
download_export "categories" "json" "categories.json"
download_export "payees" "csv" "payees.csv"
download_export "payees" "json" "payees.json"
download_export "income-sources" "csv" "income_sources.csv"
download_export "income-sources" "json" "income_sources.json"

# Download with filters
echo
echo -e "${BLUE}Downloading filtered exports...${NC}"
download_export "transactions" "csv" "transactions_2025.csv&start_date=2025-01-01&end_date=2025-12-31"
download_export "transactions" "json" "expense_transactions.json&transaction_type=expense"

echo
echo -e "${GREEN}✓ All exports downloaded to $OUTPUT_DIR/${NC}"
echo
echo "You can review the files with:"
echo "  ls -la $OUTPUT_DIR/"
echo "  cat $OUTPUT_DIR/categories.json | jq ."
echo "  open $OUTPUT_DIR/envelopes.csv"