-- Fix payoff logic: should clear current_balance completely and return excess to budget

CREATE OR REPLACE FUNCTION public.update_envelope_balance() 
RETURNS TRIGGER AS $$
DECLARE
  amount_change DECIMAL(12, 2);
  envelope_type TEXT;
  current_balance_amount DECIMAL(12, 2);
  excess_amount DECIMAL(12, 2);
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- For transfers and expenses, decrease from_envelope balance
    IF NEW.from_envelope_id IS NOT NULL THEN
      -- Handle payoff transactions specially
      IF NEW.transaction_type = 'payoff' THEN
        -- Get current envelope state
        SELECT e.envelope_type, e.current_balance INTO envelope_type, current_balance_amount
        FROM public.envelopes e 
        WHERE e.id = NEW.from_envelope_id;
        
        -- Calculate excess (current_balance minus payoff amount)
        excess_amount := current_balance_amount - NEW.amount;
        
        -- Update envelope: clear current_balance completely, clear target_amount
        UPDATE public.envelopes 
        SET 
          current_balance = 0,
          target_amount = 0
        WHERE id = NEW.from_envelope_id;
        
        -- Return excess to budget available_amount if any
        IF excess_amount > 0 THEN
          UPDATE public.budgets 
          SET available_amount = available_amount + excess_amount
          WHERE id = NEW.budget_id;
        END IF;
        
      -- Handle expense transactions based on envelope type
      ELSIF NEW.transaction_type = 'expense' THEN
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
        -- Non-expense/payoff transactions: just update current_balance
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
    
  -- Handle UPDATE (simplified for payoff - they shouldn't be updated)
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only process if not just a soft delete/restore
    IF OLD.is_deleted = NEW.is_deleted THEN
      -- Handle from_envelope changes
      IF OLD.from_envelope_id IS DISTINCT FROM NEW.from_envelope_id OR OLD.amount != NEW.amount OR OLD.transaction_type != NEW.transaction_type THEN
        -- Reverse old transaction
        IF OLD.from_envelope_id IS NOT NULL THEN
          -- Handle old payoff transaction reversal (complex - not recommended)
          IF OLD.transaction_type = 'payoff' THEN
            -- For payoff reversals, we'd need to restore the original target_amount and remove excess from budget
            -- This is complex and not recommended for payoff transactions
            RAISE EXCEPTION 'Payoff transactions should not be updated - delete and recreate instead';
            
          -- Handle old expense transaction reversal
          ELSIF OLD.transaction_type = 'expense' THEN
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
            -- Non-expense/payoff transactions: just reverse current_balance
            UPDATE public.envelopes 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.from_envelope_id;
          END IF;
        END IF;
        
        -- Apply new transaction
        IF NEW.from_envelope_id IS NOT NULL THEN
          -- Handle new payoff transaction
          IF NEW.transaction_type = 'payoff' THEN
            SELECT e.envelope_type, e.current_balance INTO envelope_type, current_balance_amount
            FROM public.envelopes e 
            WHERE e.id = NEW.from_envelope_id;
            
            -- Calculate excess
            excess_amount := current_balance_amount - NEW.amount;
            
            -- Update envelope: clear completely
            UPDATE public.envelopes 
            SET 
              current_balance = 0,
              target_amount = 0
            WHERE id = NEW.from_envelope_id;
            
            -- Return excess to budget
            IF excess_amount > 0 THEN
              UPDATE public.budgets 
              SET available_amount = available_amount + excess_amount
              WHERE id = NEW.budget_id;
            END IF;
            
          -- Handle new expense transaction
          ELSIF NEW.transaction_type = 'expense' THEN
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
            -- Non-expense/payoff transactions: just update current_balance
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
        -- Handle payoff transaction reversal
        IF NEW.transaction_type = 'payoff' THEN
          -- Complex reversal - restore original state
          RAISE EXCEPTION 'Payoff transactions should be hard deleted, not soft deleted';
          
        -- Handle expense transaction reversal
        ELSIF NEW.transaction_type = 'expense' THEN
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
          -- Non-expense/payoff transactions: just reverse current_balance
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
        -- Handle payoff transaction
        IF NEW.transaction_type = 'payoff' THEN
          -- Complex restoration - not recommended
          RAISE EXCEPTION 'Payoff transactions should not be restored from soft delete';
          
        -- Handle expense transaction
        ELSIF NEW.transaction_type = 'expense' THEN
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
          -- Non-expense/payoff transactions: just update current_balance
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
    
  -- Handle DELETE (hard delete)
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the transaction
    IF OLD.from_envelope_id IS NOT NULL THEN
      -- Handle payoff transaction reversal
      IF OLD.transaction_type = 'payoff' THEN
        -- For payoff, we need to restore the original target_amount and remove excess from budget
        -- This would require storing the original target_amount, which we don't have
        -- For now, just reverse the current_balance change
        UPDATE public.envelopes 
        SET current_balance = current_balance + OLD.amount
        WHERE id = OLD.from_envelope_id;
        
      -- Handle expense transaction reversal
      ELSIF OLD.transaction_type = 'expense' THEN
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
        -- Non-expense/payoff transactions: just reverse current_balance
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