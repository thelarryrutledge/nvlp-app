-- Migration: Performance Optimization Indexes
-- Description: Add composite indexes for common query patterns identified in API services
-- Phase 12.1: Database Performance Optimization

-- =====================================================
-- TRANSACTION TABLE PERFORMANCE INDEXES
-- =====================================================

-- Dashboard queries: transactions by budget_id + transaction_type + date range
CREATE INDEX idx_transactions_budget_type_date ON public.transactions(budget_id, transaction_type, transaction_date) 
WHERE is_deleted = false;

-- Dashboard queries: transactions by budget_id + is_cleared + is_deleted
CREATE INDEX idx_transactions_budget_cleared ON public.transactions(budget_id, is_cleared) 
WHERE is_deleted = false;

-- Transaction filters: budget_id + transaction_date (for date range queries)
CREATE INDEX idx_transactions_budget_date_desc ON public.transactions(budget_id, transaction_date DESC) 
WHERE is_deleted = false;

-- Transaction filters: budget_id + amount (for amount range queries)
CREATE INDEX idx_transactions_budget_amount ON public.transactions(budget_id, amount) 
WHERE is_deleted = false;

-- Dashboard stats: spending by category with joins
CREATE INDEX idx_transactions_category_type_date ON public.transactions(category_id, transaction_type, transaction_date) 
WHERE is_deleted = false AND category_id IS NOT NULL;

-- Income stats: income_source queries with date
CREATE INDEX idx_transactions_income_source_date ON public.transactions(income_source_id, transaction_date) 
WHERE is_deleted = false AND income_source_id IS NOT NULL;

-- Transaction reconciliation queries
CREATE INDEX idx_transactions_budget_reconciled ON public.transactions(budget_id, is_reconciled) 
WHERE is_deleted = false;

-- =====================================================
-- ENVELOPE TABLE PERFORMANCE INDEXES
-- =====================================================

-- Dashboard queries: envelopes by budget + is_active + current_balance
CREATE INDEX idx_envelopes_budget_active_balance ON public.envelopes(budget_id, is_active, current_balance);

-- Low balance notifications: budget + notify flag + balance threshold
CREATE INDEX idx_envelopes_low_balance_notify ON public.envelopes(budget_id, notify_on_low_balance, current_balance) 
WHERE notify_on_low_balance = true AND low_balance_threshold IS NOT NULL;

-- Envelope queries by category with ordering
CREATE INDEX idx_envelopes_category_name ON public.envelopes(category_id, name) 
WHERE is_active = true;

-- =====================================================
-- CATEGORY TABLE PERFORMANCE INDEXES
-- =====================================================

-- Category hierarchy queries with totals
CREATE INDEX idx_categories_budget_parent_total ON public.categories(budget_id, parent_id, total);

-- Category type queries (income vs expense)
CREATE INDEX idx_categories_budget_type_name ON public.categories(budget_id, type, name);

-- =====================================================
-- PAYEE TABLE PERFORMANCE INDEXES
-- =====================================================

-- Payee search queries
CREATE INDEX idx_payees_budget_name_active ON public.payees(budget_id, name, is_active) 
WHERE is_active = true;

-- Payee queries with basic columns (removing total_paid and last_payment_date until confirmed they exist)
-- These indexes will be added once the payee tracking columns are confirmed in the schema

-- =====================================================
-- INCOME SOURCES TABLE PERFORMANCE INDEXES
-- =====================================================

-- Income sources by date (for overdue and upcoming queries)
CREATE INDEX idx_income_sources_budget_date_active ON public.income_sources(budget_id, next_expected_date) 
WHERE is_active = true;

-- =====================================================
-- USER PROFILES TABLE PERFORMANCE INDEXES
-- =====================================================

-- User profile lookups by id (auth.uid()) - Primary key already provides this index
-- CREATE INDEX idx_user_profiles_id ON public.user_profiles(id); -- Not needed, PK provides this

-- =====================================================
-- TRANSACTION EVENTS TABLE PERFORMANCE INDEXES
-- =====================================================

-- Transaction audit queries: transaction_id + timestamp
CREATE INDEX idx_transaction_events_transaction_timestamp ON public.transaction_events(transaction_id, event_timestamp DESC);

-- User activity queries: user_id + timestamp
CREATE INDEX idx_transaction_events_user_timestamp ON public.transaction_events(user_id, event_timestamp DESC);

-- =====================================================
-- BUDGET TABLE PERFORMANCE INDEXES
-- =====================================================

-- Budget listings: user_id + created_at (already exists but ensuring DESC order)
CREATE INDEX IF NOT EXISTS idx_budgets_user_created_desc ON public.budgets(user_id, created_at DESC) 
WHERE is_active = true;

-- Budget currency queries (for multi-currency support)
CREATE INDEX IF NOT EXISTS idx_budgets_user_currency ON public.budgets(user_id, currency) 
WHERE is_active = true;

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================

-- These indexes are designed to optimize the most common query patterns:
-- 1. Dashboard summary queries (multiple table joins with filters)
-- 2. Transaction listing with various filter combinations
-- 3. Date range queries for reporting and stats
-- 4. Category and envelope hierarchy queries
-- 5. Payee search and ranking queries
-- 6. Income source scheduling queries
-- 7. Audit trail queries

-- Index naming convention: idx_[table]_[columns]_[condition]
-- WHERE clauses are used to create partial indexes for better performance
-- DESC ordering is specified where query patterns consistently use descending order

COMMENT ON SCHEMA public IS 'Performance indexes added for Phase 12.1 optimization';