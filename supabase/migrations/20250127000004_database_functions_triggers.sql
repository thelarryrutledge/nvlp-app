-- Migration: Database Functions and Triggers
-- Creates functions and triggers for transaction balance updates, soft delete support, and budget calculations

-- Function to update envelope balance after transaction changes
CREATE OR REPLACE FUNCTION public.update_envelope_balance() 
RETURNS TRIGGER AS $$
DECLARE
  amount_change DECIMAL(12, 2);
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- For transfers and expenses, decrease from_envelope balance
    IF NEW.from_envelope_id IS NOT NULL THEN
      UPDATE public.envelopes 
      SET current_balance = current_balance - NEW.amount
      WHERE id = NEW.from_envelope_id;
    END IF;
    
    -- For transfers and allocations, increase to_envelope balance
    IF NEW.to_envelope_id IS NOT NULL THEN
      UPDATE public.envelopes 
      SET current_balance = current_balance + NEW.amount
      WHERE id = NEW.to_envelope_id;
    END IF;
    
  -- Handle UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only process if not just a soft delete/restore
    IF OLD.is_deleted = NEW.is_deleted THEN
      -- Handle from_envelope changes
      IF OLD.from_envelope_id IS DISTINCT FROM NEW.from_envelope_id OR OLD.amount != NEW.amount THEN
        -- Reverse old transaction
        IF OLD.from_envelope_id IS NOT NULL THEN
          UPDATE public.envelopes 
          SET current_balance = current_balance + OLD.amount
          WHERE id = OLD.from_envelope_id;
        END IF;
        -- Apply new transaction
        IF NEW.from_envelope_id IS NOT NULL THEN
          UPDATE public.envelopes 
          SET current_balance = current_balance - NEW.amount
          WHERE id = NEW.from_envelope_id;
        END IF;
      END IF;
      
      -- Handle to_envelope changes
      IF OLD.to_envelope_id IS DISTINCT FROM NEW.to_envelope_id OR OLD.amount != NEW.amount THEN
        -- Reverse old transaction
        IF OLD.to_envelope_id IS NOT NULL THEN
          UPDATE public.envelopes 
          SET current_balance = current_balance - OLD.amount
          WHERE id = OLD.to_envelope_id;
        END IF;
        -- Apply new transaction
        IF NEW.to_envelope_id IS NOT NULL THEN
          UPDATE public.envelopes 
          SET current_balance = current_balance + NEW.amount
          WHERE id = NEW.to_envelope_id;
        END IF;
      END IF;
    -- Handle soft delete
    ELSIF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      -- Reverse the transaction
      IF NEW.from_envelope_id IS NOT NULL THEN
        UPDATE public.envelopes 
        SET current_balance = current_balance + NEW.amount
        WHERE id = NEW.from_envelope_id;
      END IF;
      IF NEW.to_envelope_id IS NOT NULL THEN
        UPDATE public.envelopes 
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.to_envelope_id;
      END IF;
    -- Handle restore from soft delete
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      -- Reapply the transaction
      IF NEW.from_envelope_id IS NOT NULL THEN
        UPDATE public.envelopes 
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.from_envelope_id;
      END IF;
      IF NEW.to_envelope_id IS NOT NULL THEN
        UPDATE public.envelopes 
        SET current_balance = current_balance + NEW.amount
        WHERE id = NEW.to_envelope_id;
      END IF;
    END IF;
    
  -- Handle DELETE (hard delete - should not happen with soft deletes)
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the transaction
    IF OLD.from_envelope_id IS NOT NULL THEN
      UPDATE public.envelopes 
      SET current_balance = current_balance + OLD.amount
      WHERE id = OLD.from_envelope_id;
    END IF;
    IF OLD.to_envelope_id IS NOT NULL THEN
      UPDATE public.envelopes 
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.to_envelope_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for envelope balance updates
CREATE TRIGGER update_envelope_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_envelope_balance();

-- Function to update budget available_amount after income transactions
CREATE OR REPLACE FUNCTION public.update_budget_available() 
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- For income transactions, increase budget available_amount
    IF NEW.transaction_type = 'income' THEN
      UPDATE public.budgets 
      SET available_amount = available_amount + NEW.amount
      WHERE id = NEW.budget_id;
    -- For allocation transactions, decrease budget available_amount
    ELSIF NEW.transaction_type = 'allocation' THEN
      UPDATE public.budgets 
      SET available_amount = available_amount - NEW.amount
      WHERE id = NEW.budget_id;
    END IF;
    
  -- Handle UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only process if not just a soft delete/restore
    IF OLD.is_deleted = NEW.is_deleted THEN
      -- Handle income transactions
      IF OLD.transaction_type = 'income' OR NEW.transaction_type = 'income' THEN
        -- Reverse old amount
        IF OLD.transaction_type = 'income' THEN
          UPDATE public.budgets 
          SET available_amount = available_amount - OLD.amount
          WHERE id = OLD.budget_id;
        END IF;
        -- Apply new amount
        IF NEW.transaction_type = 'income' THEN
          UPDATE public.budgets 
          SET available_amount = available_amount + NEW.amount
          WHERE id = NEW.budget_id;
        END IF;
      END IF;
      
      -- Handle allocation transactions
      IF OLD.transaction_type = 'allocation' OR NEW.transaction_type = 'allocation' THEN
        -- Reverse old amount
        IF OLD.transaction_type = 'allocation' THEN
          UPDATE public.budgets 
          SET available_amount = available_amount + OLD.amount
          WHERE id = OLD.budget_id;
        END IF;
        -- Apply new amount
        IF NEW.transaction_type = 'allocation' THEN
          UPDATE public.budgets 
          SET available_amount = available_amount - NEW.amount
          WHERE id = NEW.budget_id;
        END IF;
      END IF;
    -- Handle soft delete
    ELSIF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      -- Reverse the transaction
      IF NEW.transaction_type = 'income' THEN
        UPDATE public.budgets 
        SET available_amount = available_amount - NEW.amount
        WHERE id = NEW.budget_id;
      ELSIF NEW.transaction_type = 'allocation' THEN
        UPDATE public.budgets 
        SET available_amount = available_amount + NEW.amount
        WHERE id = NEW.budget_id;
      END IF;
    -- Handle restore from soft delete
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      -- Reapply the transaction
      IF NEW.transaction_type = 'income' THEN
        UPDATE public.budgets 
        SET available_amount = available_amount + NEW.amount
        WHERE id = NEW.budget_id;
      ELSIF NEW.transaction_type = 'allocation' THEN
        UPDATE public.budgets 
        SET available_amount = available_amount - NEW.amount
        WHERE id = NEW.budget_id;
      END IF;
    END IF;
    
  -- Handle DELETE (hard delete - should not happen with soft deletes)
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the transaction
    IF OLD.transaction_type = 'income' THEN
      UPDATE public.budgets 
      SET available_amount = available_amount - OLD.amount
      WHERE id = OLD.budget_id;
    ELSIF OLD.transaction_type = 'allocation' THEN
      UPDATE public.budgets 
      SET available_amount = available_amount + OLD.amount
      WHERE id = OLD.budget_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for budget available_amount updates
CREATE TRIGGER update_budget_available_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_available();

-- Function to soft delete a transaction
CREATE OR REPLACE FUNCTION public.soft_delete_transaction(
  transaction_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.transactions
  SET 
    is_deleted = true,
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = transaction_id
    AND is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = transactions.budget_id 
      AND budgets.user_id = auth.uid()
    );
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted transaction
CREATE OR REPLACE FUNCTION public.restore_transaction(
  transaction_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.transactions
  SET 
    is_deleted = false,
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = transaction_id
    AND is_deleted = true
    AND EXISTS (
      SELECT 1 FROM public.budgets 
      WHERE budgets.id = transactions.budget_id 
      AND budgets.user_id = auth.uid()
    );
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete old soft-deleted transactions (for cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_deleted_transactions(
  days_old INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.transactions
  WHERE is_deleted = true
    AND deleted_at < NOW() - INTERVAL '1 day' * days_old;
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get budget summary with calculated totals
CREATE OR REPLACE FUNCTION public.get_budget_summary(
  budget_id_param UUID
) RETURNS TABLE (
  budget_id UUID,
  available_amount DECIMAL(12, 2),
  total_allocated DECIMAL(12, 2),
  total_in_envelopes DECIMAL(12, 2),
  total_income DECIMAL(12, 2),
  total_expenses DECIMAL(12, 2),
  envelope_count INTEGER,
  negative_envelope_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS budget_id,
    b.available_amount,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'allocation' AND NOT t.is_deleted THEN t.amount ELSE 0 END), 0) AS total_allocated,
    COALESCE((SELECT SUM(e.current_balance) FROM public.envelopes e WHERE e.budget_id = b.id AND e.is_active), 0) AS total_in_envelopes,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'income' AND NOT t.is_deleted THEN t.amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN t.transaction_type IN ('expense', 'debt_payment') AND NOT t.is_deleted THEN t.amount ELSE 0 END), 0) AS total_expenses,
    COALESCE((SELECT COUNT(*) FROM public.envelopes e WHERE e.budget_id = b.id AND e.is_active), 0)::INTEGER AS envelope_count,
    COALESCE((SELECT COUNT(*) FROM public.envelopes e WHERE e.budget_id = b.id AND e.is_active AND e.current_balance < 0), 0)::INTEGER AS negative_envelope_count
  FROM public.budgets b
  LEFT JOIN public.transactions t ON t.budget_id = b.id
  WHERE b.id = budget_id_param
    AND b.user_id = auth.uid()
  GROUP BY b.id, b.available_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;