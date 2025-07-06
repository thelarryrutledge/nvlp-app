# NVLP Backend Development Todo (Fresh Start - Lessons Learned)

## Phase 1: Foundation & Authentication (PRIORITY)

### Task 1: Project Setup & Environment
- [x] Verify Supabase project is accessible
- [x] Test Supabase CLI connection with proper tokens
- [x] Verify environment variables (.env.local) are correct
- [x] Test basic Edge Function deployment works
- [x] Confirm database access with proper credentials

### Task 2: Simple Authentication Test
- [x] Create minimal "hello world" Edge Function to test deployment
- [x] Create simple auth register endpoint (POST /auth/register)
- [x] Test register endpoint with curl/Postman FIRST
- [x] Create simple auth login endpoint (POST /auth/login)
- [x] Test login endpoint with curl/Postman FIRST
- [x] Verify JWT token generation and format
- [x] Test token validation with a protected endpoint
- [x] Document exact request/response format

### Task 3: Authentication Foundation
- [x] Implement complete auth endpoints (register, logout, profile, refresh)
- [x] Add proper error handling and CORS support
- [x] Test each endpoint individually with curl
- [x] Verify password reset flow works
- [x] Add request validation and input sanitization
- [x] Document all auth API endpoints

## Phase 2: Database Schema (After Auth 100% Working)

### Task 4: Core Tables Creation
- [x] Create user_profiles table (extends auth.users)
- [x] Create budgets table with user relationship
- [x] Test database tables with direct SQL queries
- [x] Add Row Level Security (RLS) policies
- [x] Test RLS policies with multiple test users
- [x] Create default budget automation

### Task 5: Business Logic Tables
- [x] Create income_sources table (budget-scoped)
- [x] Create categories table (budget-scoped) 
- [x] Create envelopes table (budget-scoped)
- [x] Create payees table (budget-scoped)
- [x] Create transactions table (budget-scoped)
- [x] Add necessary indexes and constraints
- [x] Test all tables work with RLS policies

### Task 6: Advanced Database Features
- [x] Create transaction_events table (audit trail)
- [x] Create user_state table (available amount tracking)
- [x] Add database functions for calculations
- [x] Create triggers for automatic updates
- [x] Test trigger functions work with RLS
- [x] Add comprehensive data validation

## Phase 3: API Development (Test Each Endpoint Immediately)

### Task 7: Profile & Budget APIs
- [x] Create user profile CRUD endpoints
- [ ] Create budget CRUD endpoints
- [ ] Test each endpoint with curl/Postman before moving on
- [ ] Verify authentication works for each endpoint
- [ ] Add proper error messages and validation
- [ ] Test edge cases and error conditions

### Task 8: Core Business APIs
- [ ] Create income sources CRUD endpoints
- [ ] Create categories CRUD endpoints
- [ ] Create envelopes CRUD endpoints
- [ ] Create payees CRUD endpoints
- [ ] Test each API module completely before next
- [ ] Verify data isolation between users

### Task 9: Transaction System
- [ ] Create transaction validation functions
- [ ] Create transaction CRUD endpoints
- [ ] Implement transaction types (income, expense, allocation, transfer)
- [ ] Test transaction logic with real data
- [ ] Add balance calculation and state updates
- [ ] Test envelope balance tracking

### Task 10: Advanced Features
- [ ] Create dashboard API endpoint
- [ ] Create reporting APIs
- [ ] Create data export functionality
- [ ] Add audit trail endpoints
- [ ] Test performance with larger datasets
- [ ] Add caching where appropriate

## Phase 4: CLI Development (Build & Test Incrementally)

### Task 11: CLI Foundation
- [ ] Set up CLI project structure
- [ ] Create simple HTTP client for API calls
- [ ] Test API client with auth endpoints
- [ ] Implement configuration management
- [ ] Test auth token storage and retrieval
- [ ] Verify token persistence between commands

### Task 12: Basic CLI Commands
- [ ] Implement auth commands (login, logout, status)
- [ ] Test each command works with real API
- [ ] Implement config commands (show, set, validate)
- [ ] Add colored output and error handling
- [ ] Test complete auth flow end-to-end
- [ ] Fix any auth persistence issues

### Task 13: Business Logic CLI Commands
- [ ] Implement budget management commands
- [ ] Implement transaction commands (income, expense)
- [ ] Implement dashboard command
- [ ] Test each command with real API data
- [ ] Add interactive prompts where appropriate
- [ ] Test error handling and edge cases

## Phase 5: Integration & Testing

### Task 14: End-to-End Testing
- [ ] Test complete user journey (register → login → create budget → add transactions)
- [ ] Test CLI commands work with real backend data
- [ ] Test error scenarios (network failures, invalid tokens, etc.)
- [ ] Test with multiple users to verify data isolation
- [ ] Performance test with realistic data volumes
- [ ] Test all edge cases and error conditions

### Task 15: Documentation & Polish
- [ ] Create comprehensive API documentation
- [ ] Document CLI commands and usage
- [ ] Create setup and deployment guides
- [ ] Add error message improvements
- [ ] Create troubleshooting guides
- [ ] Add configuration validation

## Phase 6: Advanced Features (Optional)

### Task 16: Additional Features
- [ ] Add notification support
- [ ] Implement data import/export
- [ ] Add advanced reporting features
- [ ] Create backup/restore functionality
- [ ] Add bulk operations
- [ ] Performance optimizations

## Key Lessons Learned & New Principles

### Critical Success Factors
1. **Test Every Step**: Never build more than one component without testing
2. **API First**: Test all endpoints with curl before building CLI
3. **Simple Start**: Begin with minimal functionality, add complexity gradually
4. **Auth Must Work**: Don't proceed until authentication is 100% functional
5. **Real Data Testing**: Test with actual API calls, not just unit tests

### Technical Lessons
1. **Edge Function URL Routing**: Supabase Edge Functions need careful path handling
2. **JWT Token Flow**: Login → Store → Use → Refresh cycle must be rock solid
3. **RLS Policies**: Must work with triggers and database functions
4. **CLI Token Persistence**: Configuration storage must survive between command runs
5. **Error Messages**: Need to be specific enough for debugging

### Development Process
1. **Build Small**: Create one endpoint, test it completely, then move on
2. **Test Immediately**: Use curl/Postman to verify each endpoint
3. **Document as You Go**: Keep track of request/response formats
4. **Collaborative Testing**: Have human test each component as it's built
5. **Incremental Complexity**: Start simple, add features one at a time

### Debugging Strategy
1. **Detailed Logging**: Add console.log to understand what's happening
2. **External Testing**: Test with curl before testing with CLI
3. **Step-by-Step**: Isolate each component and verify it works
4. **Real Environment**: Test in actual deployment, not just local
5. **Multiple Perspectives**: Use both automated and manual testing

## Environment Requirements
- Fresh Supabase project OR clean existing project
- Verified environment variables
- Working Supabase CLI with proper authentication
- Access to Edge Function logs for debugging
- Ability to test endpoints externally (curl/Postman)

## Success Criteria
1. All auth endpoints work perfectly with external testing tools
2. CLI can authenticate and maintain session across commands
3. All API endpoints are tested and documented
4. Complete user workflow works end-to-end
5. Error handling is comprehensive and helpful
6. System is ready for production use