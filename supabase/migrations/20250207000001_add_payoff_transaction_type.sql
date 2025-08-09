-- Migration: Add PAYOFF transaction type
-- Adds support for debt payoff transactions that zero out envelope balances

-- Add PAYOFF to transaction_type enum
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'payoff' AFTER 'debt_payment';

-- Update the envelope balance trigger to handle payoff transactions
CREATE OR REPLACE FUNCTION public.update_envelope_balance() 
RETURNS TRIGGER AS $$
DECLARE
  amount_change DECIMAL(12, 2);
  envelope_type_from TEXT;
  envelope_type_to TEXT;
  current_envelope_balance DECIMAL(12, 2);
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- For transfers and expenses, decrease from_envelope balance
    IF NEW.from_envelope_id IS NOT NULL THEN
      -- For payoff transactions, use the entire envelope balance
      IF NEW.transaction_type = 'payoff' THEN
        -- Get current balance
        SELECT current_balance INTO current_envelope_balance
        FROM public.envelopes 
        WHERE id = NEW.from_envelope_id;
        
        -- Set the transaction amount to the envelope balance if not specified
        IF NEW.amount IS NULL OR NEW.amount = 0 THEN
          NEW.amount := current_envelope_balance;
        END IF;
        
        -- Zero out the envelope balance
        UPDATE public.envelopes 
        SET current_balance = 0,
            target_amount = 0  -- Also zero the target for debt envelopes
        WHERE id = NEW.from_envelope_id;
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
            -- For payoff reversal, restore the amount that was paid
            UPDATE public.envelopes 
            SET current_balance = current_balance + OLD.amount,
                target_amount = target_amount + OLD.amount  -- Restore debt amount
            WHERE id = OLD.from_envelope_id;
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
            -- Get current balance for payoff
            SELECT current_balance INTO current_envelope_balance
            FROM public.envelopes 
            WHERE id = NEW.from_envelope_id;
            
            -- Set the transaction amount to the envelope balance if not specified
            IF NEW.amount IS NULL OR NEW.amount = 0 THEN
              NEW.amount := current_envelope_balance;
            END IF;
            
            -- Zero out the envelope
            UPDATE public.envelopes 
            SET current_balance = 0,
                target_amount = 0
            WHERE id = NEW.from_envelope_id;
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
          -- Restore the payoff amount
          UPDATE public.envelopes 
          SET current_balance = current_balance + OLD.amount,
              target_amount = target_amount + OLD.amount
          WHERE id = OLD.from_envelope_id;
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
          -- For restored payoff, zero out the envelope again
          UPDATE public.envelopes 
          SET current_balance = 0,
              target_amount = 0
          WHERE id = NEW.from_envelope_id;
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
        -- Restore the payoff amount
        UPDATE public.envelopes 
        SET current_balance = current_balance + OLD.amount,
            target_amount = target_amount + OLD.amount
        WHERE id = OLD.from_envelope_id;
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

-- Add comment explaining payoff transaction type
COMMENT ON COLUMN public.transactions.transaction_type IS 'Type of transaction: income (money in), expense (money out), transfer (between envelopes), allocation (from available to envelope), debt_payment (paying down debt), payoff (complete debt payoff zeroing envelope)';