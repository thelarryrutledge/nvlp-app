-- Update triggers to handle expense transactions based on envelope type
-- For debt envelopes: expense decreases both current_balance and target_amount
-- For regular envelopes: expense only decreases current_balance

-- Updated function to handle envelope balance changes with debt envelope logic
CREATE OR REPLACE FUNCTION public.update_envelope_balance() 
RETURNS TRIGGER AS $$
DECLARE
  amount_change DECIMAL(12, 2);
  envelope_type TEXT;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- For transfers and expenses, decrease from_envelope balance
    IF NEW.from_envelope_id IS NOT NULL THEN
      -- Get envelope type for expense transactions
      IF NEW.transaction_type = 'expense' THEN
        SELECT e.envelope_type INTO envelope_type 
        FROM public.envelopes e 
        WHERE e.id = NEW.from_envelope_id;
        
        -- Update current_balance for all envelope types
        UPDATE public.envelopes 
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.from_envelope_id;
        
        -- For debt envelopes, also decrease target_amount (paying down debt)
        IF envelope_type = 'debt' THEN
          UPDATE public.envelopes 
          SET target_amount = target_amount - NEW.amount
          WHERE id = NEW.from_envelope_id;
        END IF;
      ELSE
        -- Non-expense transactions: just update current_balance
        UPDATE public.envelopes 
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.from_envelope_id;
      END IF;
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
      IF OLD.from_envelope_id IS DISTINCT FROM NEW.from_envelope_id OR OLD.amount != NEW.amount OR OLD.transaction_type != NEW.transaction_type THEN
        -- Reverse old transaction
        IF OLD.from_envelope_id IS NOT NULL THEN
          -- Handle old expense transaction reversal
          IF OLD.transaction_type = 'expense' THEN
            SELECT e.envelope_type INTO envelope_type 
            FROM public.envelopes e 
            WHERE e.id = OLD.from_envelope_id;
            
            -- Reverse current_balance change
            UPDATE public.envelopes 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.from_envelope_id;
            
            -- For debt envelopes, also reverse target_amount change
            IF envelope_type = 'debt' THEN
              UPDATE public.envelopes 
              SET target_amount = target_amount + OLD.amount
              WHERE id = OLD.from_envelope_id;
            END IF;
          ELSE
            -- Non-expense transactions: just reverse current_balance
            UPDATE public.envelopes 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.from_envelope_id;
          END IF;
        END IF;
        
        -- Apply new transaction
        IF NEW.from_envelope_id IS NOT NULL THEN
          -- Handle new expense transaction
          IF NEW.transaction_type = 'expense' THEN
            SELECT e.envelope_type INTO envelope_type 
            FROM public.envelopes e 
            WHERE e.id = NEW.from_envelope_id;
            
            -- Update current_balance
            UPDATE public.envelopes 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.from_envelope_id;
            
            -- For debt envelopes, also decrease target_amount
            IF envelope_type = 'debt' THEN
              UPDATE public.envelopes 
              SET target_amount = target_amount - NEW.amount
              WHERE id = NEW.from_envelope_id;
            END IF;
          ELSE
            -- Non-expense transactions: just update current_balance
            UPDATE public.envelopes 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.from_envelope_id;
          END IF;
        END IF;
      END IF;
      
      -- Handle to_envelope changes (no special logic needed for debt envelopes here)
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
        -- Handle expense transaction reversal
        IF NEW.transaction_type = 'expense' THEN
          SELECT e.envelope_type INTO envelope_type 
          FROM public.envelopes e 
          WHERE e.id = NEW.from_envelope_id;
          
          -- Reverse current_balance change
          UPDATE public.envelopes 
          SET current_balance = current_balance + NEW.amount
          WHERE id = NEW.from_envelope_id;
          
          -- For debt envelopes, also reverse target_amount change
          IF envelope_type = 'debt' THEN
            UPDATE public.envelopes 
            SET target_amount = target_amount + NEW.amount
            WHERE id = NEW.from_envelope_id;
          END IF;
        ELSE
          -- Non-expense transactions: just reverse current_balance
          UPDATE public.envelopes 
          SET current_balance = current_balance + NEW.amount
          WHERE id = NEW.from_envelope_id;
        END IF;
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
        -- Handle expense transaction
        IF NEW.transaction_type = 'expense' THEN
          SELECT e.envelope_type INTO envelope_type 
          FROM public.envelopes e 
          WHERE e.id = NEW.from_envelope_id;
          
          -- Update current_balance
          UPDATE public.envelopes 
          SET current_balance = current_balance - NEW.amount
          WHERE id = NEW.from_envelope_id;
          
          -- For debt envelopes, also decrease target_amount
          IF envelope_type = 'debt' THEN
            UPDATE public.envelopes 
            SET target_amount = target_amount - NEW.amount
            WHERE id = NEW.from_envelope_id;
          END IF;
        ELSE
          -- Non-expense transactions: just update current_balance
          UPDATE public.envelopes 
          SET current_balance = current_balance - NEW.amount
          WHERE id = NEW.from_envelope_id;
        END IF;
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
      -- Handle expense transaction reversal
      IF OLD.transaction_type = 'expense' THEN
        SELECT e.envelope_type INTO envelope_type 
        FROM public.envelopes e 
        WHERE e.id = OLD.from_envelope_id;
        
        -- Reverse current_balance change
        UPDATE public.envelopes 
        SET current_balance = current_balance + OLD.amount
        WHERE id = OLD.from_envelope_id;
        
        -- For debt envelopes, also reverse target_amount change
        IF envelope_type = 'debt' THEN
          UPDATE public.envelopes 
          SET target_amount = target_amount + OLD.amount
          WHERE id = OLD.from_envelope_id;
        END IF;
      ELSE
        -- Non-expense transactions: just reverse current_balance
        UPDATE public.envelopes 
        SET current_balance = current_balance + OLD.amount
        WHERE id = OLD.from_envelope_id;
      END IF;
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

-- Update the budget summary function to account for simplified transaction types
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
    COALESCE(SUM(CASE WHEN t.transaction_type IN ('expense', 'payoff') AND NOT t.is_deleted THEN t.amount ELSE 0 END), 0) AS total_expenses,
    COALESCE((SELECT COUNT(*) FROM public.envelopes e WHERE e.budget_id = b.id AND e.is_active), 0)::INTEGER AS envelope_count,
    COALESCE((SELECT COUNT(*) FROM public.envelopes e WHERE e.budget_id = b.id AND e.is_active AND e.current_balance < 0), 0)::INTEGER AS negative_envelope_count
  FROM public.budgets b
  LEFT JOIN public.transactions t ON t.budget_id = b.id
  WHERE b.id = budget_id_param
    AND b.user_id = auth.uid()
  GROUP BY b.id, b.available_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;