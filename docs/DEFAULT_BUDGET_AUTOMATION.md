# Default Budget Automation

## Overview
The default budget automation system ensures every user has exactly one default budget at all times. This automation is implemented using PostgreSQL triggers and functions.

## Features ✅

### 1. Auto-Creation
When a user profile is created, a default budget is automatically created and linked.

**Trigger:** `create_default_budget_on_profile_creation`
- **Event:** AFTER INSERT ON public.user_profiles
- **Function:** `public.create_default_budget_for_user()`

### 2. Auto-Linking
The user's profile is automatically updated with the default budget ID.

**Process:**
1. Default budget is created with `is_default = true`
2. `user_profiles.default_budget_id` is set to the new budget's ID
3. Foreign key constraint ensures data integrity

### 3. Single Default Constraint
Only one budget per user can be marked as default at any time.

**Trigger:** `ensure_single_default_budget_trigger`
- **Event:** BEFORE INSERT OR UPDATE ON public.budgets
- **Function:** `public.ensure_single_default_budget()`
- **Behavior:** When a budget is set as default, all other budgets for that user are set to `is_default = false`

### 4. Cascade Deletion
When a user is deleted, all their budgets are automatically deleted.

**Implementation:** Foreign key constraint with `ON DELETE CASCADE`

## Database Functions

### create_default_budget_for_user()
```sql
CREATE OR REPLACE FUNCTION public.create_default_budget_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a default budget when a user profile is created
    INSERT INTO public.budgets (user_id, name, description, is_default, is_active)
    VALUES (
        NEW.id,
        'My Budget',
        'Default budget for envelope budgeting',
        true,
        true
    );
    
    -- Update the user profile with the new default budget ID
    UPDATE public.user_profiles 
    SET default_budget_id = (
        SELECT id FROM public.budgets 
        WHERE user_id = NEW.id AND is_default = true 
        LIMIT 1
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### ensure_single_default_budget()
```sql
CREATE OR REPLACE FUNCTION public.ensure_single_default_budget()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a budget as default, unset all other defaults for this user
    IF NEW.is_default = true THEN
        UPDATE public.budgets 
        SET is_default = false 
        WHERE user_id = NEW.user_id 
          AND id != NEW.id 
          AND is_default = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing Results ✅

### Existing User Verification
- ✅ All existing users have default budgets created and linked
- ✅ `user_profiles.default_budget_id` correctly references `budgets.id`
- ✅ Default budgets are properly marked with `is_default = true`

### Constraint Testing
- ✅ Creating a new default budget automatically demotes the previous default
- ✅ Users maintain exactly 1 default budget at all times
- ✅ No orphaned default budget references

### Data Integrity
- ✅ Foreign key constraints prevent invalid references
- ✅ RLS policies ensure users can only access their own budgets
- ✅ Cascade deletion removes budgets when users are deleted

## User Experience

### New User Flow
1. User registers → `auth.users` record created
2. Email confirmed → `user_profiles` record created (via existing trigger)
3. Profile creation → Default budget auto-created and linked
4. User immediately has a working budget system

### Default Budget Management
- Users always have exactly one default budget
- Creating additional budgets doesn't affect the default
- Setting a different budget as default automatically updates the system
- No manual intervention required

## Migration Files
- **user_profiles:** `20250706142628_create_user_profiles.sql`
- **budgets + automation:** `20250706145134_create_budgets.sql`

## Test Scripts
- **Automation testing:** `./scripts/test-default-budget-automation.sh`
- **RLS testing:** `./scripts/test-rls-policies.sh`
- **Multi-user testing:** `./scripts/test-multi-user-rls.sh`

## Security Features
- **RLS Protection:** Users can only access their own budgets
- **SECURITY DEFINER:** Functions run with elevated privileges for system operations
- **Data Isolation:** Complete separation between users' budget data
- **Constraint Enforcement:** Database-level validation prevents invalid states

## Benefits
1. **Zero Configuration:** Users get working budgets immediately
2. **Data Consistency:** Constraints prevent invalid states
3. **Performance:** Database-level automation is efficient
4. **Reliability:** Triggers ensure automation never fails
5. **Security:** RLS and constraints protect data integrity