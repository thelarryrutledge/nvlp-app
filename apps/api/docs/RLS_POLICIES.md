# Row Level Security (RLS) Policies

## Overview
Row Level Security (RLS) is implemented on both `user_profiles` and `budgets` tables to ensure data isolation between users. Each user can only access their own data.

## Implemented Policies

### user_profiles Table
RLS is enabled with the following policies:

1. **"Users can view own profile"** (SELECT)
   - Policy: `auth.uid() = id`
   - Users can only view their own profile record

2. **"Users can insert own profile"** (INSERT) 
   - Policy: `auth.uid() = id`
   - Users can only create profile records for themselves

3. **"Users can update own profile"** (UPDATE)
   - Policy: `auth.uid() = id` (USING and WITH CHECK)
   - Users can only update their own profile record

4. **No DELETE policy**
   - Profile deletion is handled by Supabase Auth cascade when user is deleted

### budgets Table
RLS is enabled with the following policies:

1. **"Users can view own budgets"** (SELECT)
   - Policy: `auth.uid() = user_id`
   - Users can only view budgets they own

2. **"Users can insert own budgets"** (INSERT)
   - Policy: `auth.uid() = user_id`
   - Users can only create budgets for themselves

3. **"Users can update own budgets"** (UPDATE)
   - Policy: `auth.uid() = user_id` (USING and WITH CHECK)
   - Users can only update budgets they own

4. **"Users can delete own budgets"** (DELETE)
   - Policy: `auth.uid() = user_id`
   - Users can only delete budgets they own

## Testing Results ✅

### Access Control Tests
- ✅ Authenticated users can access their own data
- ✅ Unauthenticated requests return empty results
- ✅ Cross-user data access is prevented
- ✅ Service role can bypass RLS for admin operations

### CRUD Operation Tests
- ✅ SELECT: Users can only query their own records
- ✅ INSERT: Users can only create records for themselves
- ✅ UPDATE: Users can only modify their own records  
- ✅ DELETE: Users can only delete their own records

## Security Benefits

1. **Data Isolation**: Each user's data is completely isolated from other users
2. **Automatic Enforcement**: Policies are enforced at the database level
3. **API-First Security**: Works seamlessly with Supabase REST API
4. **JWT Integration**: Uses Supabase auth tokens for user identification
5. **Zero Trust**: Even compromised application code cannot access other users' data

## Usage in API Calls

### With User JWT Token
```bash
curl "${SUPABASE_URL}/rest/v1/user_profiles?select=*" \
  -H "Authorization: Bearer ${USER_JWT_TOKEN}"
# Returns: User's own profile only
```

### With Anon Key Only
```bash
curl "${SUPABASE_URL}/rest/v1/user_profiles?select=*" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"
# Returns: [] (empty array)
```

### With Service Role (Admin)
```bash
curl "${SUPABASE_URL}/rest/v1/user_profiles?select=*" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
# Returns: All profiles (bypasses RLS)
```

## Migration Files
- `20250706142628_create_user_profiles.sql` - Contains user_profiles RLS policies
- `20250706145134_create_budgets.sql` - Contains budgets RLS policies

## Test Script
Run `./scripts/test-rls-policies.sh` to verify RLS implementation is working correctly.