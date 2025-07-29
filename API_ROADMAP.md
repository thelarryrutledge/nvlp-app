# NVLP API Development Roadmap

## Overview
This roadmap outlines the complete API development process for NVLP, from database setup through full API implementation with comprehensive testing.

## Phase 1: Foundation Setup ✅ Completed
- [x] Initialize monorepo structure
- [x] Create types package with all entity interfaces
- [x] Create API service layer architecture
- [x] Set up TypeScript configuration

## Phase 2: Supabase Database Setup
### 2.1 Database Schema Creation
- [x] Create Supabase project and configure environment
- [x] Create database migration for auth schema extensions
  - [x] user_profiles table with auth trigger
  - [x] Add display_name and avatar_url to auth.users metadata
- [x] Create core entity tables
  - [x] budgets table with RLS policies
  - [x] categories table with self-referential hierarchy
  - [x] income_sources table
  - [x] payees table
  - [x] envelopes table with balance tracking
- [x] Create transaction tables
  - [x] transactions table with complex constraints
  - [x] transaction_events audit table
- [x] Create database functions and triggers
  - [x] Auto-update timestamps trigger
  - [x] Transaction balance update triggers
  - [x] Soft delete support functions
  - [x] Budget available_amount calculation

### 2.2 Row Level Security (RLS) Setup
- [x] Enable RLS on all tables
- [x] Create user isolation policies
- [x] Create budget access policies
- [x] Test RLS with multiple users

## Phase 3: Authentication Implementation
### 3.1 Magic Link Authentication
- [x] Configure Supabase Auth for magic link only
- [x] Disable email/password authentication
- [x] Set up email templates for magic links
- [x] Configure redirect URLs for deep linking
- [x] Test magic link flow

### 3.2 Auth API Endpoints
- [x] POST /auth/magic-link - Send magic link email
- [x] ~~GET /auth/callback~~ - Not needed (Supabase handles automatically)
- [x] POST /auth/logout - Sign out user (clears refresh token + session)
- [x] GET /auth/user - Get current user profile
- [x] PATCH /auth/user - Update user profile

### 3.3 Token Management
- [x] Implement automatic token refresh in API layer
- [x] Add token persistence for offline support
- [x] Handle token expiration gracefully
- [x] Test token refresh flow

## Phase 4: Support Entity APIs
### 4.1 Categories API
- [x] GET /budgets/{budgetId}/categories - List all categories
- [x] GET /categories/{id} - Get single category
- [x] POST /budgets/{budgetId}/categories - Create category
- [x] PATCH /categories/{id} - Update category
- [x] DELETE /categories/{id} - Delete category
- [x] GET /budgets/{budgetId}/categories/tree - Get hierarchical view

### 4.2 Income Sources API
- [x] GET /budgets/{budgetId}/income-sources - List income sources
- [x] GET /income-sources/{id} - Get single income source
- [x] POST /budgets/{budgetId}/income-sources - Create income source
- [x] PATCH /income-sources/{id} - Update income source
- [x] DELETE /income-sources/{id} - Delete income source
- [x] GET /budgets/{budgetId}/income-sources/overdue - Get overdue sources
- [x] GET /budgets/{budgetId}/income-sources/upcoming - Get upcoming sources

### 4.3 Payees API
- [x] GET /budgets/{budgetId}/payees - List payees
- [x] GET /payees/{id} - Get single payee
- [x] POST /budgets/{budgetId}/payees - Create payee
- [x] PATCH /payees/{id} - Update payee
- [x] DELETE /payees/{id} - Delete payee
- [x] GET /budgets/{budgetId}/payees/search?q={query} - Search payees
- [x] GET /budgets/{budgetId}/payees/recent - Get recent payees
- [x] GET /budgets/{budgetId}/payees/top - Get top payees by spending

## Phase 5: Core Entity APIs
### 5.1 Budgets API
- [x] GET /budgets - List user's budgets
- [x] GET /budgets/{id} - Get single budget
- [x] POST /budgets - Create budget (empty - no default objects)
- [x] PATCH /budgets/{id} - Update budget
- [x] DELETE /budgets/{id} - Delete budget
- [x] POST /budgets/{id}/set-default - Set as default budget
- [x] GET /budgets/default - Get user's default budget
- [x] POST /budgets/{id}/setup/defaults - Create default categories, envelopes, etc.
- [x] POST /budgets/{id}/setup/demo - Create demo data for testing/examples

### 5.2 Envelopes API
- [x] GET /budgets/{budgetId}/envelopes - List envelopes
- [x] GET /envelopes/{id} - Get single envelope
- [x] POST /budgets/{budgetId}/envelopes - Create envelope
- [x] PATCH /envelopes/{id} - Update envelope
- [x] DELETE /envelopes/{id} - Delete envelope (if balance is zero)
- [x] GET /budgets/{budgetId}/envelopes/negative - Get negative balance envelopes
- [x] GET /budgets/{budgetId}/envelopes/low-balance - Get low balance envelopes

## Phase 6: Transaction System
### 6.1 Basic Transaction APIs
- [x] GET /budgets/{budgetId}/transactions - List transactions with filters
- [x] GET /transactions/{id} - Get single transaction with details
- [x] POST /budgets/{budgetId}/transactions - Create transaction
- [x] PATCH /transactions/{id} - Update transaction
- [x] DELETE /transactions/{id} - Soft delete transaction
- [x] POST /transactions/{id}/restore - Restore deleted transaction

### 6.2 Transaction Business Logic
- [x] Implement income transaction flow (increases available)
- [x] Implement allocation flow (available → envelope)
- [x] Implement expense flow (envelope → payee)
- [ ] Implement transfer flow (envelope → envelope)
- [ ] Implement debt payment flow
- [ ] Add transaction validation rules
- [ ] Test balance updates and constraints

### 6.3 Transaction Queries
- [ ] GET /envelopes/{id}/transactions - Get envelope transactions
- [ ] GET /payees/{id}/transactions - Get payee transactions
- [ ] GET /budgets/{budgetId}/transactions/recent - Recent transactions
- [ ] GET /budgets/{budgetId}/transactions/pending - Uncleared transactions

## Phase 6.5: Budget Setup & Demo Data
### 6.5.1 Default Budget Setup
- [ ] Create common expense categories (Groceries, Gas, Entertainment, etc.)
- [ ] Create common income categories (Salary, Side Income, etc.)
- [ ] Create starter envelopes (Emergency Fund, Groceries, Gas, etc.)
- [ ] Create common payees (Grocery Store, Gas Station, etc.)
- [ ] Make setup idempotent (safe to call multiple times)

### 6.5.2 Demo Data Creation
- [ ] Create realistic demo transactions
- [ ] Set up sample income and allocation patterns
- [ ] Create negative balance scenarios for testing
- [ ] Generate historical data for reporting tests

## Phase 7: Dashboard & Reporting
### 7.1 Dashboard API
- [ ] GET /budgets/{budgetId}/dashboard - Get dashboard summary
- [ ] GET /budgets/{budgetId}/stats/spending - Spending by category/time
- [ ] GET /budgets/{budgetId}/stats/income - Income analysis
- [ ] GET /budgets/{budgetId}/stats/trends - Spending trends

### 7.2 Export APIs
- [ ] GET /budgets/{budgetId}/export/transactions - Export transactions (CSV/JSON)
- [ ] GET /budgets/{budgetId}/export/budget - Export budget snapshot

## Phase 8: Edge Functions vs PostgREST Strategy
### 8.1 PostgREST Direct Access (for simple CRUD)
- [ ] Document PostgREST endpoints for all entities
- [ ] Create PostgREST client configuration
- [ ] Add proper auth headers for PostgREST
- [ ] Test direct PostgREST performance

### 8.2 Edge Functions (for complex logic)
- [ ] Create edge function for transaction creation (complex validation)
- [ ] Create edge function for bulk operations
- [ ] Create edge function for dashboard calculations
- [ ] Create edge function for notification triggers
- [ ] Create edge function for budget setup (defaults/demo data)
- [ ] Create edge function for bulk envelope operations

## Phase 9: Client Library Implementation
### 9.1 Core Client Setup
- [ ] Implement base HTTP client with retry logic
- [ ] Add automatic token refresh interceptor
- [ ] Configure for both Supabase URL and custom domain
- [ ] Add offline queue for failed requests

### 9.2 Service Clients
- [ ] Implement AuthClient with magic link support
- [ ] Implement BudgetClient
- [ ] Implement EnvelopeClient
- [ ] Implement TransactionClient
- [ ] Implement support entity clients

## Phase 10: Testing Infrastructure
### 10.1 API Test Suite
- [ ] Set up Jest for API testing
- [ ] Create test utilities and fixtures
- [ ] Write integration tests for each service
- [ ] Add performance benchmarks

### 10.2 cURL Test Scripts
- [ ] Create auth flow test scripts
- [ ] Create CRUD test scripts for each entity
- [ ] Create transaction flow test scripts
- [ ] Create error scenario test scripts

### 10.3 Shell Script Test Suite
- [ ] Create test.sh master script
- [ ] Add individual entity test scripts
- [ ] Add end-to-end workflow tests
- [ ] Add cleanup and reset scripts

## Phase 11: Documentation
### 11.1 API Documentation
- [ ] Generate OpenAPI/Swagger specification
- [ ] Document all endpoints with examples
- [ ] Create authentication guide
- [ ] Add error code reference

### 11.2 Integration Guides
- [ ] PostgREST integration guide
- [ ] Edge function development guide
- [ ] Client library usage guide
- [ ] Mobile app integration guide

## Phase 12: Performance & Security
### 12.1 Performance Optimization
- [ ] Add database indexes for common queries
- [ ] Implement response caching where appropriate
- [ ] Optimize N+1 query issues
- [ ] Add connection pooling

### 12.2 Security Hardening
- [ ] Audit all RLS policies
- [ ] Add rate limiting
- [ ] Implement request validation
- [ ] Add security headers

## Completion Criteria
- [ ] All API endpoints functional and tested
- [ ] Authentication flow working with magic links
- [ ] Automatic token refresh implemented
- [ ] Complete test coverage with cURL examples
- [ ] Shell script test suite passing
- [ ] Performance benchmarks met
- [ ] Security audit completed

## Design Principles
- **Clean Budget Creation**: New budgets are created completely empty
- **Optional Setup**: Separate endpoints for adding default objects vs demo data
- **No Auto-Population**: Users explicitly choose what to add to their budget
- **Idempotent Setup**: Setup endpoints can be called multiple times safely
- **Testing-Friendly**: Demo data endpoint creates realistic scenarios for development

## Notes
- Each completed phase should be tested before moving to the next
- PostgREST will be used for all simple CRUD operations
- Edge Functions only for complex business logic
- All APIs must work with both Supabase URL and future custom domain
- Focus on API completeness - mobile app comes after API is fully tested