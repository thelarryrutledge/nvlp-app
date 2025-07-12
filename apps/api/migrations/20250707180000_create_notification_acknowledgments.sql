-- Migration: Create notification acknowledgments table
-- Purpose: Track which notifications have been shown to users
-- Date: 2025-07-07

-- Create notification acknowledgments table
CREATE TABLE public.notification_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and budget relationship
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'income_source_due',
        'income_source_overdue', 
        'envelope_date_due',
        'envelope_amount_threshold',
        'envelope_overbudget',
        'transaction_uncleared'
    )),
    
    -- Related entity (either income_source_id, envelope_id, or transaction_id)
    related_entity_id UUID NOT NULL,
    related_entity_type TEXT NOT NULL CHECK (related_entity_type IN (
        'income_source',
        'envelope', 
        'transaction'
    )),
    
    -- Notification trigger date (the date this notification was relevant for)
    notification_date DATE NOT NULL,
    
    -- Acknowledgment tracking
    acknowledged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_dismissed BOOLEAN DEFAULT false NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notification_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own notification acknowledgments
CREATE POLICY "Users can view own notification acknowledgments" 
    ON public.notification_acknowledgments 
    FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification acknowledgments" 
    ON public.notification_acknowledgments 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification acknowledgments" 
    ON public.notification_acknowledgments 
    FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notification acknowledgments" 
    ON public.notification_acknowledgments 
    FOR DELETE 
    USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_notification_acknowledgments_user_budget 
ON public.notification_acknowledgments(user_id, budget_id);

CREATE INDEX idx_notification_acknowledgments_type_date 
ON public.notification_acknowledgments(notification_type, notification_date);

CREATE INDEX idx_notification_acknowledgments_entity 
ON public.notification_acknowledgments(related_entity_type, related_entity_id);

CREATE INDEX idx_notification_acknowledgments_date_range 
ON public.notification_acknowledgments(notification_date, acknowledged_at);

-- Create unique constraint to prevent duplicate acknowledgments
CREATE UNIQUE INDEX idx_notification_acknowledgments_unique 
ON public.notification_acknowledgments(
    user_id, 
    budget_id, 
    notification_type, 
    related_entity_id, 
    notification_date
);

-- Add helpful comments
COMMENT ON TABLE public.notification_acknowledgments IS 'Tracks which notifications have been shown to users';
COMMENT ON COLUMN public.notification_acknowledgments.user_id IS 'User who received the notification';
COMMENT ON COLUMN public.notification_acknowledgments.budget_id IS 'Budget the notification relates to';
COMMENT ON COLUMN public.notification_acknowledgments.notification_type IS 'Type of notification shown';
COMMENT ON COLUMN public.notification_acknowledgments.related_entity_id IS 'ID of the income source, envelope, or transaction';
COMMENT ON COLUMN public.notification_acknowledgments.related_entity_type IS 'Type of entity (income_source, envelope, transaction)';
COMMENT ON COLUMN public.notification_acknowledgments.notification_date IS 'Date this notification was relevant for';
COMMENT ON COLUMN public.notification_acknowledgments.acknowledged_at IS 'When the notification was first shown';
COMMENT ON COLUMN public.notification_acknowledgments.is_dismissed IS 'Whether user has dismissed this notification';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_notification_acknowledgments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notification_acknowledgments_updated_at_trigger
    BEFORE UPDATE ON public.notification_acknowledgments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_acknowledgments_updated_at();