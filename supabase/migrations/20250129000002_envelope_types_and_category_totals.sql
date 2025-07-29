-- Migration: Envelope Types and Category Totals
-- Adds envelope types, category totals, debt payment dual balance logic, and debt payee fields

-- Add envelope_type to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN envelope_type TEXT DEFAULT 'regular' NOT NULL;

-- Add constraint for valid envelope types
ALTER TABLE public.envelopes 
ADD CONSTRAINT envelopes_envelope_type_valid CHECK (
  envelope_type IN ('regular', 'savings', 'debt')
);

-- Add total field to categories for performance
ALTER TABLE public.categories 
ADD COLUMN total DECIMAL(12, 2) DEFAULT 0.00 NOT NULL;

-- Add debt-specific fields to payees for tracking purposes
ALTER TABLE public.payees 
ADD COLUMN payee_type TEXT DEFAULT 'regular' NOT NULL,
ADD COLUMN interest_rate DECIMAL(5, 2),
ADD COLUMN minimum_payment DECIMAL(12, 2),
ADD COLUMN due_date INTEGER; -- Day of month (1-31)

-- Add constraint for valid payee types
ALTER TABLE public.payees 
ADD CONSTRAINT payees_payee_type_valid CHECK (
  payee_type IN ('regular', 'debt')
);

-- Note: Single-level nesting will be enforced in application code
-- PostgreSQL CHECK constraints cannot contain subqueries

-- Create index for category totals
CREATE INDEX idx_categories_total ON public.categories(total);
CREATE INDEX idx_envelopes_envelope_type ON public.envelopes(envelope_type);
CREATE INDEX idx_payees_payee_type ON public.payees(payee_type);

-- Function to update category totals
CREATE OR REPLACE FUNCTION public.update_category_totals()
RETURNS TRIGGER AS $$
DECLARE
  old_category_id UUID;
  new_category_id UUID;
  parent_category_id UUID;
BEGIN
  -- Determine which categories need updating based on trigger operation
  IF TG_OP = 'INSERT' THEN
    new_category_id := NEW.category_id;
  ELSIF TG_OP = 'UPDATE' THEN
    old_category_id := OLD.category_id;
    new_category_id := NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    old_category_id := OLD.category_id;
  END IF;

  -- Update old category total (UPDATE/DELETE)
  IF old_category_id IS NOT NULL THEN
    UPDATE public.categories 
    SET total = COALESCE((
      SELECT SUM(e.current_balance) 
      FROM public.envelopes e 
      WHERE e.category_id = old_category_id 
      AND e.is_active = true
    ), 0)
    WHERE id = old_category_id;

    -- Update old category's parent total if it exists
    SELECT parent_id INTO parent_category_id 
    FROM public.categories 
    WHERE id = old_category_id;
    
    IF parent_category_id IS NOT NULL THEN
      UPDATE public.categories 
      SET total = COALESCE((
        SELECT SUM(e.current_balance) 
        FROM public.envelopes e 
        WHERE e.category_id = parent_category_id 
        AND e.is_active = true
      ), 0) + COALESCE((
        SELECT SUM(c.total) 
        FROM public.categories c 
        WHERE c.parent_id = parent_category_id
      ), 0)
      WHERE id = parent_category_id;
    END IF;
  END IF;

  -- Update new category total (INSERT/UPDATE)
  IF new_category_id IS NOT NULL THEN
    UPDATE public.categories 
    SET total = COALESCE((
      SELECT SUM(e.current_balance) 
      FROM public.envelopes e 
      WHERE e.category_id = new_category_id 
      AND e.is_active = true
    ), 0)
    WHERE id = new_category_id;

    -- Update new category's parent total if it exists
    SELECT parent_id INTO parent_category_id 
    FROM public.categories 
    WHERE id = new_category_id;
    
    IF parent_category_id IS NOT NULL THEN
      UPDATE public.categories 
      SET total = COALESCE((
        SELECT SUM(e.current_balance) 
        FROM public.envelopes e 
        WHERE e.category_id = parent_category_id 
        AND e.is_active = true
      ), 0) + COALESCE((
        SELECT SUM(c.total) 
        FROM public.categories c 
        WHERE c.parent_id = parent_category_id
      ), 0)
      WHERE id = parent_category_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for category total updates on envelope changes
CREATE TRIGGER update_category_totals_on_envelope_change
  AFTER INSERT OR UPDATE OF current_balance, category_id, is_active OR DELETE 
  ON public.envelopes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_category_totals();

-- Modify existing envelope balance trigger to handle debt payments
CREATE OR REPLACE FUNCTION public.update_envelope_balance() 
RETURNS TRIGGER AS $$
DECLARE
  amount_change DECIMAL(12, 2);
  envelope_type_from TEXT;
  envelope_type_to TEXT;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- For transfers and expenses, decrease from_envelope balance
    IF NEW.from_envelope_id IS NOT NULL THEN
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
        -- Apply new transaction
        IF NEW.from_envelope_id IS NOT NULL THEN
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
        
        -- Reverse debt paydown
        IF NEW.transaction_type = 'debt_payment' THEN
          SELECT envelope_type INTO envelope_type_from 
          FROM public.envelopes 
          WHERE id = NEW.from_envelope_id;
          
          IF envelope_type_from = 'debt' THEN
            UPDATE public.envelopes 
            SET target_amount = target_amount + NEW.amount
            WHERE id = NEW.from_envelope_id;
          END IF;
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
        UPDATE public.envelopes 
        SET current_balance = current_balance - NEW.amount
        WHERE id = NEW.from_envelope_id;
        
        -- Reapply debt paydown
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
      
      -- Reverse debt paydown
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
    IF OLD.to_envelope_id IS NOT NULL THEN
      UPDATE public.envelopes 
      SET current_balance = current_balance - OLD.amount
      WHERE id = OLD.to_envelope_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize category totals for existing data
UPDATE public.categories 
SET total = COALESCE((
  SELECT SUM(e.current_balance) 
  FROM public.envelopes e 
  WHERE e.category_id = categories.id 
  AND e.is_active = true
), 0)
WHERE parent_id IS NOT NULL; -- Child categories first

-- Then update parent categories (direct envelopes + child category totals)
UPDATE public.categories 
SET total = COALESCE((
  SELECT SUM(e.current_balance) 
  FROM public.envelopes e 
  WHERE e.category_id = categories.id 
  AND e.is_active = true
), 0) + COALESCE((
  SELECT SUM(c.total) 
  FROM public.categories c 
  WHERE c.parent_id = categories.id
), 0)
WHERE parent_id IS NULL; -- Parent categories

-- Add comments for documentation
COMMENT ON COLUMN public.envelopes.envelope_type IS 'Type of envelope: regular (spending), savings (building up), debt (paying down)';
COMMENT ON COLUMN public.categories.total IS 'Cached total of all envelope balances in this category (includes child categories for parents)';
COMMENT ON COLUMN public.payees.payee_type IS 'Type of payee: regular (expenses) or debt (debt payments)';
COMMENT ON COLUMN public.payees.interest_rate IS 'Annual interest rate for debt payees (for tracking purposes)';
COMMENT ON COLUMN public.payees.minimum_payment IS 'Minimum monthly payment for debt payees (for tracking purposes)';
COMMENT ON COLUMN public.payees.due_date IS 'Day of month payment is due (1-31, for tracking purposes)';