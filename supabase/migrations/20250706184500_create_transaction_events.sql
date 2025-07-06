-- Migration: 011_create_transaction_events.sql
-- Purpose: Create transaction_events table for audit trail functionality
-- Date: 2025-07-06

-- Create transaction events table for audit trail
CREATE TABLE public.transaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction relationship
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'deleted', 'restored')),
    event_description TEXT, -- Human readable description of what changed
    
    -- Track what changed (JSON field for flexibility)
    changes_made JSONB, -- Store old/new values for fields that changed
    
    -- Context
    performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Additional metadata
    user_agent TEXT, -- Browser/client info
    ip_address INET, -- User's IP address
    session_id TEXT, -- Session identifier
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access events for transactions in their own budgets
CREATE POLICY "Users can view transaction events in own budgets" 
    ON public.transaction_events 
    FOR SELECT 
    USING (
        budget_id IN (
            SELECT id FROM public.budgets WHERE user_id = auth.uid()
        )
    );

-- No insert/update/delete policies - events are created only by triggers
CREATE POLICY "System can insert transaction events" 
    ON public.transaction_events 
    FOR INSERT 
    WITH CHECK (true); -- System-level inserts only

-- Create function to log transaction events
CREATE OR REPLACE FUNCTION public.log_transaction_event()
RETURNS TRIGGER AS $$
DECLARE
    event_type_val TEXT;
    changes_json JSONB := '{}';
    event_desc TEXT;
BEGIN
    -- Determine event type and description
    IF TG_OP = 'INSERT' THEN
        event_type_val := 'created';
        event_desc := 'Transaction created: ' || NEW.transaction_type || ' for $' || NEW.amount;
        
        -- For new transactions, log all key fields
        changes_json := jsonb_build_object(
            'transaction_type', NEW.transaction_type,
            'amount', NEW.amount,
            'description', NEW.description,
            'transaction_date', NEW.transaction_date,
            'from_envelope_id', NEW.from_envelope_id,
            'to_envelope_id', NEW.to_envelope_id,
            'payee_id', NEW.payee_id,
            'income_source_id', NEW.income_source_id,
            'category_id', NEW.category_id
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine if this is a soft delete, restore, or regular update
        IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
            event_type_val := 'deleted';
            event_desc := 'Transaction soft deleted: ' || NEW.transaction_type || ' for $' || NEW.amount;
            changes_json := jsonb_build_object(
                'is_deleted', jsonb_build_object('old', OLD.is_deleted, 'new', NEW.is_deleted),
                'deleted_at', NEW.deleted_at,
                'deleted_by', NEW.deleted_by
            );
        ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
            event_type_val := 'restored';
            event_desc := 'Transaction restored from soft delete: ' || NEW.transaction_type || ' for $' || NEW.amount;
            changes_json := jsonb_build_object(
                'is_deleted', jsonb_build_object('old', OLD.is_deleted, 'new', NEW.is_deleted)
            );
        ELSE
            event_type_val := 'updated';
            event_desc := 'Transaction modified: ' || NEW.transaction_type || ' for $' || NEW.amount;
            
            -- Track what changed
            changes_json := '{}';
            
            IF OLD.amount != NEW.amount THEN
                changes_json := changes_json || jsonb_build_object(
                    'amount', jsonb_build_object('old', OLD.amount, 'new', NEW.amount)
                );
            END IF;
            
            IF OLD.description != NEW.description OR (OLD.description IS NULL AND NEW.description IS NOT NULL) OR (OLD.description IS NOT NULL AND NEW.description IS NULL) THEN
                changes_json := changes_json || jsonb_build_object(
                    'description', jsonb_build_object('old', OLD.description, 'new', NEW.description)
                );
            END IF;
            
            IF OLD.transaction_date != NEW.transaction_date THEN
                changes_json := changes_json || jsonb_build_object(
                    'transaction_date', jsonb_build_object('old', OLD.transaction_date, 'new', NEW.transaction_date)
                );
            END IF;
            
            IF OLD.from_envelope_id != NEW.from_envelope_id OR (OLD.from_envelope_id IS NULL AND NEW.from_envelope_id IS NOT NULL) OR (OLD.from_envelope_id IS NOT NULL AND NEW.from_envelope_id IS NULL) THEN
                changes_json := changes_json || jsonb_build_object(
                    'from_envelope_id', jsonb_build_object('old', OLD.from_envelope_id, 'new', NEW.from_envelope_id)
                );
            END IF;
            
            IF OLD.to_envelope_id != NEW.to_envelope_id OR (OLD.to_envelope_id IS NULL AND NEW.to_envelope_id IS NOT NULL) OR (OLD.to_envelope_id IS NOT NULL AND NEW.to_envelope_id IS NULL) THEN
                changes_json := changes_json || jsonb_build_object(
                    'to_envelope_id', jsonb_build_object('old', OLD.to_envelope_id, 'new', NEW.to_envelope_id)
                );
            END IF;
            
            IF OLD.payee_id != NEW.payee_id OR (OLD.payee_id IS NULL AND NEW.payee_id IS NOT NULL) OR (OLD.payee_id IS NOT NULL AND NEW.payee_id IS NULL) THEN
                changes_json := changes_json || jsonb_build_object(
                    'payee_id', jsonb_build_object('old', OLD.payee_id, 'new', NEW.payee_id)
                );
            END IF;
            
            IF OLD.category_id != NEW.category_id OR (OLD.category_id IS NULL AND NEW.category_id IS NOT NULL) OR (OLD.category_id IS NOT NULL AND NEW.category_id IS NULL) THEN
                changes_json := changes_json || jsonb_build_object(
                    'category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id)
                );
            END IF;
            
            IF OLD.reference_number != NEW.reference_number OR (OLD.reference_number IS NULL AND NEW.reference_number IS NOT NULL) OR (OLD.reference_number IS NOT NULL AND NEW.reference_number IS NULL) THEN
                changes_json := changes_json || jsonb_build_object(
                    'reference_number', jsonb_build_object('old', OLD.reference_number, 'new', NEW.reference_number)
                );
            END IF;
            
            IF OLD.notes != NEW.notes OR (OLD.notes IS NULL AND NEW.notes IS NOT NULL) OR (OLD.notes IS NOT NULL AND NEW.notes IS NULL) THEN
                changes_json := changes_json || jsonb_build_object(
                    'notes', jsonb_build_object('old', OLD.notes, 'new', NEW.notes)
                );
            END IF;
            
            IF OLD.is_cleared != NEW.is_cleared THEN
                changes_json := changes_json || jsonb_build_object(
                    'is_cleared', jsonb_build_object('old', OLD.is_cleared, 'new', NEW.is_cleared)
                );
            END IF;
            
            IF OLD.is_reconciled != NEW.is_reconciled THEN
                changes_json := changes_json || jsonb_build_object(
                    'is_reconciled', jsonb_build_object('old', OLD.is_reconciled, 'new', NEW.is_reconciled)
                );
            END IF;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        event_type_val := 'deleted';
        event_desc := 'Transaction hard deleted: ' || OLD.transaction_type || ' for $' || OLD.amount;
        changes_json := jsonb_build_object(
            'all_data', row_to_json(OLD)
        );
    END IF;
    
    -- Insert the event record
    INSERT INTO public.transaction_events (
        transaction_id,
        budget_id,
        event_type,
        event_description,
        changes_made,
        performed_by
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.budget_id, OLD.budget_id),
        event_type_val,
        event_desc,
        changes_json,
        auth.uid()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log all transaction events
CREATE TRIGGER log_transaction_events_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.log_transaction_event();

-- Add helpful comments
COMMENT ON TABLE public.transaction_events IS 'Audit trail for all transaction modifications';
COMMENT ON COLUMN public.transaction_events.id IS 'Primary key for event record';
COMMENT ON COLUMN public.transaction_events.transaction_id IS 'Foreign key to transactions.id';
COMMENT ON COLUMN public.transaction_events.budget_id IS 'Foreign key to budgets.id for RLS';
COMMENT ON COLUMN public.transaction_events.event_type IS 'Type of event (created, updated, deleted, restored)';
COMMENT ON COLUMN public.transaction_events.event_description IS 'Human readable description of the event';
COMMENT ON COLUMN public.transaction_events.changes_made IS 'JSON object containing old/new values for changed fields';
COMMENT ON COLUMN public.transaction_events.performed_by IS 'User who performed the action';
COMMENT ON COLUMN public.transaction_events.performed_at IS 'Timestamp when the action was performed';

-- Create indexes for performance
CREATE INDEX idx_transaction_events_transaction_id ON public.transaction_events(transaction_id);
CREATE INDEX idx_transaction_events_budget_id ON public.transaction_events(budget_id);
CREATE INDEX idx_transaction_events_event_type ON public.transaction_events(budget_id, event_type);
CREATE INDEX idx_transaction_events_performed_at ON public.transaction_events(budget_id, performed_at DESC);
CREATE INDEX idx_transaction_events_performed_by ON public.transaction_events(performed_by) WHERE performed_by IS NOT NULL;