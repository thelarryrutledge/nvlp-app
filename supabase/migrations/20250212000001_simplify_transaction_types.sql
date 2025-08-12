-- Simplify transaction types: merge expense and debt_payment into expense
-- Add payoff type for negotiated debt settlements

-- First, update existing debt_payment transactions to expense
UPDATE public.transactions 
SET transaction_type = 'expense' 
WHERE transaction_type = 'debt_payment';

-- Update the transaction type constraint to remove debt_payment and add payoff
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_transaction_type_check 
CHECK (transaction_type IN ('income', 'allocation', 'expense', 'transfer', 'payoff'));

-- Add comment explaining the simplified system
COMMENT ON COLUMN public.transactions.transaction_type IS 
'Transaction type: income (adds to available), allocation (available -> envelope), expense (envelope -> payee, behavior based on envelope type), transfer (envelope -> envelope), payoff (negotiated debt settlement at reduced amount)';