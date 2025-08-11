-- Remove redundant category_id from transactions table
-- Categories can be derived from related entities (income_source, envelope, payee)

BEGIN;

-- Drop the column from transactions table
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS category_id;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_transactions_category_id;

-- Add comment explaining category derivation
COMMENT ON TABLE public.transactions IS 'Transaction records for budget entries. Categories are derived from related entities: income_source.category_id for income, envelope.category_id for allocations/transfers, payee.category_id or from_envelope.category_id for expenses/debt payments.';

COMMIT;