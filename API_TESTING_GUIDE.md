# NVLP API Testing Guide

This guide shows you how to manually test all NVLP API endpoints using curl commands.

## Quick Setup

### 1. Login and Save Token
```bash
# Login with default test user
./scripts/login-and-save-token.sh

# Or login with custom credentials
./scripts/login-and-save-token.sh "your-email@example.com" "your-password"
```

This saves your JWT token to `.token` file for easy reuse.

### 2. Test Your Setup
```bash
# Quick test - should return your profile
curl -H "Authorization: Bearer $(cat .token)" \
     -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8" \
     https://qnpatlosomopoimtsmsr.supabase.co/rest/v1/user_profiles
```

## API Configuration

```bash
# Save these for easy copy/paste
export REST_URL="https://qnpatlosomopoimtsmsr.supabase.co/rest/v1"
export ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucGF0bG9zb21vcG9pbXRzbXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTg5MzcsImV4cCI6MjA2NzIzNDkzN30.__GhvGGWqhC_i1ztp1-A1VEsL3JVWrtdpQG_uJS8tB8"

# Standard headers for authenticated requests
export AUTH_HEADERS="-H \"Authorization: Bearer \$(cat .token)\" -H \"apikey: $ANON_KEY\""
```

## Current API Endpoints (Edge Functions)

### User Profile
```bash
# Get your profile
curl -H "Authorization: Bearer $(cat .token)" https://api.nvlp.app/profile

# Update your profile
curl -H "Authorization: Bearer $(cat .token)" \
  -H "Content-Type: application/json" \
  -X PATCH https://api.nvlp.app/profile \
  -d '{"display_name": "New Name"}'

# Update multiple fields
curl -H "Authorization: Bearer $(cat .token)" \
  -H "Content-Type: application/json" \
  -X PATCH https://api.nvlp.app/profile \
  -d '{
    "display_name": "Full Name",
    "timezone": "America/New_York", 
    "currency_code": "USD",
    "date_format": "MM/DD/YYYY"
  }'

# Valid timezones: "UTC" or format like "America/New_York"
# Valid currency_codes: 3 uppercase letters like "USD", "EUR"  
# Valid date_formats: "MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"
```

### Budgets
```bash
# Get all your budgets
curl -H "Authorization: Bearer $(cat .token)" https://api.nvlp.app/budgets

# Get specific budget
curl -H "Authorization: Bearer $(cat .token)" "https://api.nvlp.app/budgets?id=YOUR_BUDGET_ID"

# Create new budget
curl -H "Authorization: Bearer $(cat .token)" \
  -H "Content-Type: application/json" \
  -X POST https://api.nvlp.app/budgets \
  -d '{
    "name": "New Budget",
    "description": "Budget description",
    "is_active": true
  }'

# Update budget
curl -H "Authorization: Bearer $(cat .token)" \
  -H "Content-Type: application/json" \
  -X PATCH "https://api.nvlp.app/budgets?id=YOUR_BUDGET_ID" \
  -d '{"name": "Updated Budget Name"}'

# Delete budget (cannot delete default budget)
curl -H "Authorization: Bearer $(cat .token)" \
  -X DELETE "https://api.nvlp.app/budgets?id=YOUR_BUDGET_ID"

# Notes:
# - name is required and must be 1-100 characters
# - description is optional and must be ≤500 characters  
# - is_active defaults to true
# - Cannot delete default budget
# - Budget names must be unique per user
```

### Income Sources
```bash
# Get income sources for a budget
curl $AUTH_HEADERS "$REST_URL/income_sources?budget_id=eq.YOUR_BUDGET_ID"

# Create new income source
curl $AUTH_HEADERS -X POST $REST_URL/income_sources \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "YOUR_BUDGET_ID",
    "name": "New Income Source",
    "description": "Description here",
    "expected_monthly_amount": 1000.00
  }'

# Update income source
curl $AUTH_HEADERS -X PATCH "$REST_URL/income_sources?id=eq.INCOME_SOURCE_ID" \
  -H "Content-Type: application/json" \
  -d '{"expected_monthly_amount": 1200.00}'

# Delete income source
curl $AUTH_HEADERS -X DELETE "$REST_URL/income_sources?id=eq.INCOME_SOURCE_ID"
```

### Categories
```bash
# Get categories for a budget
curl $AUTH_HEADERS "$REST_URL/categories?budget_id=eq.YOUR_BUDGET_ID"

# Create new category
curl $AUTH_HEADERS -X POST $REST_URL/categories \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "YOUR_BUDGET_ID",
    "name": "New Category",
    "description": "Category description",
    "color": "#FF5733",
    "category_type": "expense"
  }'
```

### Envelopes
```bash
# Get envelopes for a budget
curl $AUTH_HEADERS "$REST_URL/envelopes?budget_id=eq.YOUR_BUDGET_ID"

# Create new envelope
curl $AUTH_HEADERS -X POST $REST_URL/envelopes \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "YOUR_BUDGET_ID",
    "name": "New Envelope",
    "description": "Envelope description",
    "target_amount": 500.00,
    "color": "#4CAF50"
  }'

# Update envelope
curl $AUTH_HEADERS -X PATCH "$REST_URL/envelopes?id=eq.ENVELOPE_ID" \
  -H "Content-Type: application/json" \
  -d '{"target_amount": 600.00}'
```

### Payees
```bash
# Get payees for a budget
curl $AUTH_HEADERS "$REST_URL/payees?budget_id=eq.YOUR_BUDGET_ID"

# Create new payee
curl $AUTH_HEADERS -X POST $REST_URL/payees \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "YOUR_BUDGET_ID",
    "name": "New Payee",
    "description": "Payee description",
    "payee_type": "business",
    "color": "#2196F3"
  }'
```

### Transactions
```bash
# Get transactions for a budget
curl $AUTH_HEADERS "$REST_URL/transactions?budget_id=eq.YOUR_BUDGET_ID&order=transaction_date.desc&limit=10"

# Create income transaction
curl $AUTH_HEADERS -X POST $REST_URL/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "YOUR_BUDGET_ID",
    "transaction_type": "income",
    "amount": 100.00,
    "description": "Test income",
    "income_source_id": "INCOME_SOURCE_ID"
  }'

# Create allocation transaction
curl $AUTH_HEADERS -X POST $REST_URL/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "YOUR_BUDGET_ID",
    "transaction_type": "allocation",
    "amount": 50.00,
    "description": "Test allocation",
    "to_envelope_id": "ENVELOPE_ID"
  }'

# Create expense transaction
curl $AUTH_HEADERS -X POST $REST_URL/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "budget_id": "YOUR_BUDGET_ID",
    "transaction_type": "expense",
    "amount": 25.00,
    "description": "Test expense",
    "from_envelope_id": "ENVELOPE_ID",
    "payee_id": "PAYEE_ID"
  }'
```

### Validation Functions
```bash
# Validate budget data integrity
curl $AUTH_HEADERS -X POST $REST_URL/rpc/validate_budget_data_integrity \
  -H "Content-Type: application/json" \
  -d '{"p_budget_id": "YOUR_BUDGET_ID"}'

# Validate transaction before creating
curl $AUTH_HEADERS -X POST $REST_URL/rpc/validate_transaction_constraints \
  -H "Content-Type: application/json" \
  -d '{
    "p_budget_id": "YOUR_BUDGET_ID",
    "p_transaction_type": "income",
    "p_amount": 100.00,
    "p_income_source_id": "INCOME_SOURCE_ID"
  }'

# Fix data inconsistencies
curl $AUTH_HEADERS -X POST $REST_URL/rpc/fix_budget_data_inconsistencies \
  -H "Content-Type: application/json" \
  -d '{"p_budget_id": "YOUR_BUDGET_ID"}'
```

## Helper Scripts

### Get Your Budget ID
```bash
# Save this to use in other commands
BUDGET_ID=$(curl -s $AUTH_HEADERS $REST_URL/budgets | jq -r '.[0].id')
echo $BUDGET_ID
```

### Get Entity IDs for Testing
```bash
# Get income source ID
INCOME_SOURCE_ID=$(curl -s $AUTH_HEADERS "$REST_URL/income_sources?budget_id=eq.$BUDGET_ID&limit=1" | jq -r '.[0].id')

# Get envelope ID  
ENVELOPE_ID=$(curl -s $AUTH_HEADERS "$REST_URL/envelopes?budget_id=eq.$BUDGET_ID&limit=1" | jq -r '.[0].id')

# Get payee ID
PAYEE_ID=$(curl -s $AUTH_HEADERS "$REST_URL/payees?budget_id=eq.$BUDGET_ID&limit=1" | jq -r '.[0].id')

echo "Budget ID: $BUDGET_ID"
echo "Income Source ID: $INCOME_SOURCE_ID" 
echo "Envelope ID: $ENVELOPE_ID"
echo "Payee ID: $PAYEE_ID"
```

## Common Patterns

### Filtering and Ordering
```bash
# Filter by budget_id and order by date
curl $AUTH_HEADERS "$REST_URL/transactions?budget_id=eq.$BUDGET_ID&order=transaction_date.desc"

# Filter by type
curl $AUTH_HEADERS "$REST_URL/transactions?budget_id=eq.$BUDGET_ID&transaction_type=eq.income"

# Limit results
curl $AUTH_HEADERS "$REST_URL/transactions?budget_id=eq.$BUDGET_ID&limit=5"
```

### Select Specific Fields
```bash
# Only get id and name
curl $AUTH_HEADERS "$REST_URL/envelopes?budget_id=eq.$BUDGET_ID&select=id,name"

# Get related data
curl $AUTH_HEADERS "$REST_URL/transactions?budget_id=eq.$BUDGET_ID&select=*,payees(name),envelopes(name)"
```

## Testing Workflow

1. **Login**: `./scripts/login-and-save-token.sh`
2. **Get Budget ID**: Use the helper script above
3. **Test CRUD operations**: Create, read, update, delete for each entity
4. **Test validation**: Use the validation functions
5. **Test business logic**: Create transactions and verify balance updates

## Handling Cold Starts and Timeouts

Supabase Edge Functions may have "cold starts" after periods of inactivity, causing initial requests to timeout. This is normal serverless behavior.

### Retry Logic for Frontend Applications

```javascript
// Basic retry with exponential backoff
async function apiCallWithRetry(url, options = {}, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 
        attempt === 0 ? 10000 : 30000); // 10s first try, 30s retry
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries || 
          (error.name !== 'AbortError' && !error.message.includes('timeout'))) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`API call failed, retrying... (attempt ${attempt + 2}/${maxRetries + 1})`);
    }
  }
}

// Usage example
async function getUserProfile() {
  try {
    const response = await apiCallWithRetry('https://api.nvlp.app/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch profile after retries:', error);
    throw error;
  }
}

// React hook example with loading states
function useApiCall(url, options) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCallWithRetry(url, options);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);
  
  return { data, loading, error, execute };
}
```

### Optimistic Updates

For better user experience, update the UI immediately and handle failures gracefully:

```javascript
// Optimistic update example
async function updateBudgetName(budgetId, newName) {
  // 1. Update UI immediately (optimistic)
  updateBudgetInState(budgetId, { name: newName });
  
  try {
    // 2. Make API call
    const response = await apiCallWithRetry(`https://api.nvlp.app/budgets?id=${budgetId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newName })
    });
    
    // 3. Update with server response (in case server modified the data)
    const updatedBudget = await response.json();
    updateBudgetInState(budgetId, updatedBudget);
    
  } catch (error) {
    // 4. Revert optimistic update on failure
    revertBudgetInState(budgetId);
    showErrorMessage('Failed to update budget name');
    throw error;
  }
}
```

### Bash Retry Logic for Testing

```bash
# Function to retry curl commands
retry_curl() {
    local max_attempts=3
    local delay=2
    local attempt=1
    local description="$1"
    shift # Remove description, rest are curl args
    
    while [ $attempt -le $max_attempts ]; do
        echo -n "  Testing: $description (attempt $attempt/$max_attempts)... "
        
        if output=$(curl --max-time 30 --connect-timeout 10 "$@" 2>/dev/null); then
            echo "✓"
            echo "$output"
            return 0
        else
            if [ $attempt -eq $max_attempts ]; then
                echo "✗ (failed after $max_attempts attempts)"
                return 1
            else
                echo "timeout, retrying..."
                sleep $delay
                delay=$((delay * 2)) # Exponential backoff
            fi
        fi
        
        attempt=$((attempt + 1))
    done
}

# Usage
retry_curl "GET profile" -H "Authorization: Bearer $(cat .token)" https://api.nvlp.app/profile
```

## Troubleshooting

### Token Expired
```bash
# Just re-login
./scripts/login-and-save-token.sh
```

### RLS Access Denied
- Make sure you're using the correct budget_id that belongs to your user
- Check that the entity IDs you're referencing exist and belong to your budgets

### Invalid JSON
- Validate your JSON using `echo 'your-json' | jq .`
- Make sure all UUIDs are properly formatted

### Check Response Status
```bash
# Add -w flag to see HTTP status
curl -w "\nHTTP Status: %{http_code}\n" $AUTH_HEADERS $REST_URL/budgets
```