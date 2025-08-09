-- Migration: Fix PAYOFF transaction logic for debt envelopes
-- Corrects the payoff behavior to properly handle allocated vs owed amounts

-- Update the envelope balance trigger to correctly handle payoff transactions
CREATE OR REPLACE FUNCTION public.update_envelope_balance() 
RETURNS TRIGGER AS $$
DECLARE
  amount_change DECIMAL(12, 2);
  envelope_type_from TEXT;
  envelope_type_to TEXT;
  allocated_amount DECIMAL(12, 2);
  debt_balance DECIMAL(12, 2);
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- For transfers and expenses, decrease from_envelope balance
    IF NEW.from_envelope_id IS NOT NULL THEN
      -- For payoff transactions on debt envelopes
      IF NEW.transaction_type = 'payoff' THEN
        -- Get envelope type and amounts
        SELECT envelope_type, current_balance, target_amount 
        INTO envelope_type_from, allocated_amount, debt_balance
        FROM public.envelopes 
        WHERE id = NEW.from_envelope_id;
        
        IF envelope_type_from = 'debt' THEN
          -- Payoff: zero the debt balance and allocated amount
          -- Return any excess allocated funds to available
          IF allocated_amount > NEW.amount THEN
            -- Return excess to available
            UPDATE public.budgets 
            SET available_amount = available_amount + (allocated_amount - NEW.amount)
            WHERE id = NEW.budget_id;
          END IF;
          
          -- Zero out the envelope completely
          UPDATE public.envelopes 
          SET current_balance = 0,  -- Clear allocated funds
              target_amount = 0      -- Debt is fully paid off
          WHERE id = NEW.from_envelope_id;
        ELSE
          -- For non-debt envelopes, just decrease the balance
          UPDATE public.envelopes 
          SET current_balance = current_balance - NEW.amount
          WHERE id = NEW.from_envelope_id;
        END IF;
      ELSE
        -- Normal transaction - decrease by transaction amount
        UPDATE public.envelopes 
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.from_envelope_id;
        
        -- For debt payments, also decrease target_amount (debt paydown)
        IF NEW.transaction_type = 'debt_payment' THEN
          SELECT envelope_type INTO envelope_type_from 
          FROM public.envelopes 
          WHERE id = NEW.from_envelope_id;
          
          IF envelope_type_from = 'debt' THEN
            UPDATE public.envelopes 
            SET target_amount = GREATEST(0, target_amount - NEW.amount)
            WHERE id = NEW.from_envelope_id;
          END IF;
        END IF;
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
      IF OLD.from_envelope_id IS DISTINCT FROM NEW.from_envelope_id OR OLD.amount != NEW.amount THEN
        -- Reverse old transaction
        IF OLD.from_envelope_id IS NOT NULL THEN
          IF OLD.transaction_type = 'payoff' THEN
            SELECT envelope_type, current_balance INTO envelope_type_from, allocated_amount
            FROM public.envelopes 
            WHERE id = OLD.from_envelope_id;
            
            IF envelope_type_from = 'debt' THEN
              -- Reversing a payoff: restore debt and allocated amounts
              -- Take back any funds that were returned to available
              -- Since the envelope was zeroed, we need to restore the original allocated amount
              UPDATE public.envelopes 
              SET current_balance = OLD.amount,  -- Restore what was used for payoff
                  target_amount = OLD.amount      -- Restore debt amount
              WHERE id = OLD.from_envelope_id;
              
              -- Note: We can't determine the exact excess that was returned to available
              -- without storing it, so we just restore the payoff amount to both fields
            ELSE
              UPDATE public.envelopes 
              SET current_balance = current_balance + OLD.amount
              WHERE id = OLD.from_envelope_id;
            END IF;
          ELSE
            UPDATE public.envelopes 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.from_envelope_id;
            
            -- Reverse debt paydown if it was a debt payment
            IF OLD.transaction_type = 'debt_payment' THEN
              SELECT envelope_type INTO envelope_type_from 
              FROM public.envelopes 
              WHERE id = OLD.from_envelope_id;
              
              IF envelope_type_from = 'debt' THEN
                UPDATE public.envelopes 
                SET target_amount = target_amount + OLD.amount
                WHERE id = OLD.from_envelope_id;
              END IF;
            END IF;
          END IF;
        END IF;
        
        -- Apply new transaction
        IF NEW.from_envelope_id IS NOT NULL THEN
          IF NEW.transaction_type = 'payoff' THEN
            SELECT envelope_type, current_balance INTO envelope_type_from, allocated_amount
            FROM public.envelopes 
            WHERE id = NEW.from_envelope_id;
            
            IF envelope_type_from = 'debt' THEN
              -- Return any excess allocated funds to available
              IF allocated_amount > NEW.amount THEN
                UPDATE public.budgets 
                SET available_amount = available_amount + (allocated_amount - NEW.amount)
                WHERE id = NEW.budget_id;
              END IF;
              
              -- Zero out the envelope completely
              UPDATE public.envelopes 
              SET current_balance = 0,
                  target_amount = 0
              WHERE id = NEW.from_envelope_id;
            ELSE
              UPDATE public.envelopes 
              SET current_balance = current_balance - NEW.amount
              WHERE id = NEW.from_envelope_id;
            END IF;
          ELSE
            UPDATE public.envelopes 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.from_envelope_id;
            
            -- Apply debt paydown if it's a debt payment
            IF NEW.transaction_type = 'debt_payment' THEN
              SELECT envelope_type INTO envelope_type_from 
              FROM public.envelopes 
              WHERE id = NEW.from_envelope_id;
              
              IF envelope_type_from = 'debt' THEN
                UPDATE public.envelopes 
                SET target_amount = GREATEST(0, target_amount - NEW.amount)
                WHERE id = NEW.from_envelope_id;
              END IF;
            END IF;
          END IF;
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
      IF OLD.from_envelope_id IS NOT NULL THEN
        IF OLD.transaction_type = 'payoff' THEN
          SELECT envelope_type INTO envelope_type_from 
          FROM public.envelopes 
          WHERE id = OLD.from_envelope_id;
          
          IF envelope_type_from = 'debt' THEN
            -- Restore the payoff amount to the envelope
            -- Note: We can't determine excess that was returned to available
            UPDATE public.envelopes 
            SET current_balance = OLD.amount,  -- Restore payoff amount as allocated
                target_amount = OLD.amount      -- Restore debt
            WHERE id = OLD.from_envelope_id;
          ELSE
            UPDATE public.envelopes 
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.from_envelope_id;
          END IF;
        ELSE
          UPDATE public.envelopes 
          SET current_balance = current_balance + OLD.amount
          WHERE id = OLD.from_envelope_id;
          
          -- Reverse debt paydown if it was a debt payment
          IF OLD.transaction_type = 'debt_payment' THEN
            SELECT envelope_type INTO envelope_type_from 
            FROM public.envelopes 
            WHERE id = OLD.from_envelope_id;
            
            IF envelope_type_from = 'debt' THEN
              UPDATE public.envelopes 
              SET target_amount = target_amount + OLD.amount
              WHERE id = OLD.from_envelope_id;
            END IF;
          END IF;
        END IF;
      END IF;
      
      IF OLD.to_envelope_id IS NOT NULL THEN
        UPDATE public.envelopes 
        SET current_balance = current_balance - OLD.amount
        WHERE id = OLD.to_envelope_id;
      END IF;
    -- Handle restore
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      -- Re-apply the transaction
      IF NEW.from_envelope_id IS NOT NULL THEN
        IF NEW.transaction_type = 'payoff' THEN
          SELECT envelope_type, current_balance INTO envelope_type_from, allocated_amount
          FROM public.envelopes 
          WHERE id = NEW.from_envelope_id;
          
          IF envelope_type_from = 'debt' THEN
            -- Return any excess allocated funds to available
            IF allocated_amount > NEW.amount THEN
              UPDATE public.budgets 
              SET available_amount = available_amount + (allocated_amount - NEW.amount)
              WHERE id = NEW.budget_id;
            END IF;
            
            -- Re-apply payoff - zero out envelope
            UPDATE public.envelopes 
            SET current_balance = 0,
                target_amount = 0
            WHERE id = NEW.from_envelope_id;
          ELSE
            UPDATE public.envelopes 
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.from_envelope_id;
          END IF;
        ELSE
          UPDATE public.envelopes 
          SET current_balance = current_balance - NEW.amount
          WHERE id = NEW.from_envelope_id;
          
          -- Re-apply debt paydown if it's a debt payment
          IF NEW.transaction_type = 'debt_payment' THEN
            SELECT envelope_type INTO envelope_type_from 
            FROM public.envelopes 
            WHERE id = NEW.from_envelope_id;
            
            IF envelope_type_from = 'debt' THEN
              UPDATE public.envelopes 
              SET target_amount = GREATEST(0, target_amount - NEW.amount)
              WHERE id = NEW.from_envelope_id;
            END IF;
          END IF;
        END IF;
      END IF;
      
      IF NEW.to_envelope_id IS NOT NULL THEN
        UPDATE public.envelopes 
        SET current_balance = current_balance + NEW.amount
        WHERE id = NEW.to_envelope_id;
      END IF;
    END IF;
    
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the transaction
    IF OLD.from_envelope_id IS NOT NULL THEN
      IF OLD.transaction_type = 'payoff' THEN
        SELECT envelope_type INTO envelope_type_from 
        FROM public.envelopes 
        WHERE id = OLD.from_envelope_id;
        
        IF envelope_type_from = 'debt' THEN
          -- Restore the payoff amount
          -- Note: We can't determine excess that was returned to available
          UPDATE public.envelopes 
          SET current_balance = OLD.amount,  -- Restore as allocated
              target_amount = OLD.amount      -- Restore debt
          WHERE id = OLD.from_envelope_id;
        ELSE
          UPDATE public.envelopes 
          SET current_balance = current_balance + OLD.amount
          WHERE id = OLD.from_envelope_id;
        END IF;
      ELSE
        UPDATE public.envelopes 
        SET current_balance = current_balance + OLD.amount
        WHERE id = OLD.from_envelope_id;
        
        -- Reverse debt paydown if it was a debt payment
        IF OLD.transaction_type = 'debt_payment' THEN
          SELECT envelope_type INTO envelope_type_from 
          FROM public.envelopes 
          WHERE id = OLD.from_envelope_id;
          
          IF envelope_type_from = 'debt' THEN
            UPDATE public.envelopes 
            SET target_amount = target_amount + OLD.amount
            WHERE id = OLD.from_envelope_id;
          END IF;
        END IF;
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

-- Add comments to clarify the envelope fields for debt envelopes
COMMENT ON COLUMN public.envelopes.current_balance IS 'For regular/savings: current balance. For debt: allocated funds for payment';
COMMENT ON COLUMN public.envelopes.target_amount IS 'For regular/savings: savings goal. For debt: total amount owed';