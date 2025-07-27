-- Migration: Transaction Tables
-- Creates transactions table with complex constraints and transaction_events audit table

-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer', 'allocation', 'debt_payment');

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  transaction_date DATE NOT NULL,
  from_envelope_id UUID REFERENCES public.envelopes(id) ON DELETE RESTRICT,
  to_envelope_id UUID REFERENCES public.envelopes(id) ON DELETE RESTRICT,
  payee_id UUID REFERENCES public.payees(id) ON DELETE RESTRICT,
  income_source_id UUID REFERENCES public.income_sources(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_cleared BOOLEAN DEFAULT false NOT NULL,
  is_reconciled BOOLEAN DEFAULT false NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Complex constraints based on transaction type
  CONSTRAINT valid_income_transaction CHECK (
    transaction_type != 'income' OR (
      income_source_id IS NOT NULL AND
      from_envelope_id IS NULL AND
      to_envelope_id IS NULL AND
      payee_id IS NULL
    )
  ),
  
  CONSTRAINT valid_expense_transaction CHECK (
    transaction_type != 'expense' OR (
      from_envelope_id IS NOT NULL AND
      payee_id IS NOT NULL AND
      to_envelope_id IS NULL AND
      income_source_id IS NULL
    )
  ),
  
  CONSTRAINT valid_transfer_transaction CHECK (
    transaction_type != 'transfer' OR (
      from_envelope_id IS NOT NULL AND
      to_envelope_id IS NOT NULL AND
      from_envelope_id != to_envelope_id AND
      payee_id IS NULL AND
      income_source_id IS NULL
    )
  ),
  
  CONSTRAINT valid_allocation_transaction CHECK (
    transaction_type != 'allocation' OR (
      to_envelope_id IS NOT NULL AND
      from_envelope_id IS NULL AND
      payee_id IS NULL AND
      income_source_id IS NULL
    )
  ),
  
  CONSTRAINT valid_debt_payment_transaction CHECK (
    transaction_type != 'debt_payment' OR (
      from_envelope_id IS NOT NULL AND
      payee_id IS NOT NULL AND
      to_envelope_id IS NULL AND
      income_source_id IS NULL
    )
  ),
  
  CONSTRAINT deleted_timestamp_consistency CHECK (
    (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
    (is_deleted = true AND deleted_at IS NOT NULL)
  )
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_budget_id ON public.transactions(budget_id) WHERE is_deleted = false;
CREATE INDEX idx_transactions_transaction_date ON public.transactions(transaction_date) WHERE is_deleted = false;
CREATE INDEX idx_transactions_from_envelope_id ON public.transactions(from_envelope_id) WHERE is_deleted = false;
CREATE INDEX idx_transactions_to_envelope_id ON public.transactions(to_envelope_id) WHERE is_deleted = false;
CREATE INDEX idx_transactions_payee_id ON public.transactions(payee_id) WHERE is_deleted = false;
CREATE INDEX idx_transactions_income_source_id ON public.transactions(income_source_id) WHERE is_deleted = false;
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id) WHERE is_deleted = false;
CREATE INDEX idx_transactions_uncleared ON public.transactions(budget_id) WHERE is_cleared = false AND is_deleted = false;

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view transactions in their budgets" 
  ON public.transactions 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = transactions.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create transactions in their budgets" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = transactions.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can update transactions in their budgets" 
  ON public.transactions 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = transactions.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete transactions in their budgets" 
  ON public.transactions 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = transactions.budget_id 
    AND budgets.user_id = auth.uid()
  ));

-- Create transaction_events audit table
CREATE TABLE IF NOT EXISTS public.transaction_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'deleted', 'restored')),
  event_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[]
);

-- Create indexes for transaction_events
CREATE INDEX idx_transaction_events_transaction_id ON public.transaction_events(transaction_id);
CREATE INDEX idx_transaction_events_event_timestamp ON public.transaction_events(event_timestamp);
CREATE INDEX idx_transaction_events_user_id ON public.transaction_events(user_id);

-- Enable RLS on transaction_events
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for transaction_events (inherit transaction access)
CREATE POLICY "Users can view events for transactions in their budgets" 
  ON public.transaction_events 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.transactions t
    JOIN public.budgets b ON t.budget_id = b.id
    WHERE t.id = transaction_events.transaction_id 
    AND b.user_id = auth.uid()
  ));

-- Function to automatically log transaction events
CREATE OR REPLACE FUNCTION public.log_transaction_event() 
RETURNS TRIGGER AS $$
DECLARE
  event_type_var TEXT;
  old_record JSONB;
  new_record JSONB;
  changed_fields_var TEXT[];
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    event_type_var := 'created';
    old_record := NULL;
    new_record := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if this is a soft delete or restore
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      event_type_var := 'deleted';
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      event_type_var := 'restored';
    ELSE
      event_type_var := 'updated';
    END IF;
    
    old_record := to_jsonb(OLD);
    new_record := to_jsonb(NEW);
    
    -- Calculate changed fields
    SELECT ARRAY_AGG(key)
    INTO changed_fields_var
    FROM (
      SELECT key 
      FROM jsonb_each(old_record) o
      FULL OUTER JOIN jsonb_each(new_record) n USING (key)
      WHERE o.value IS DISTINCT FROM n.value
    ) changes;
  ELSIF TG_OP = 'DELETE' THEN
    event_type_var := 'deleted';
    old_record := to_jsonb(OLD);
    new_record := NULL;
  END IF;
  
  -- Insert audit record
  INSERT INTO public.transaction_events (
    transaction_id,
    event_type,
    user_id,
    old_values,
    new_values,
    changed_fields
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    event_type_var,
    auth.uid(),
    old_record,
    new_record,
    changed_fields_var
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for transaction audit logging
CREATE TRIGGER log_transaction_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_transaction_event();

-- Add trigger for auto-updating updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();