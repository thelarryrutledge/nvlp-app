-- Migration: Rename envelope notification amount fields for clarity
-- Purpose: Make envelope notification thresholds more intuitive
-- Date: 2025-07-08
-- Change: target_amount → notify_above_amount, notify_amount → notify_below_amount

-- Rename the columns to be more descriptive
ALTER TABLE public.envelopes 
RENAME COLUMN target_amount TO notify_above_amount;

ALTER TABLE public.envelopes 
RENAME COLUMN notify_amount TO notify_below_amount;

-- Update the constraint names to match new column names
ALTER TABLE public.envelopes 
DROP CONSTRAINT IF EXISTS envelopes_target_amount_positive;

ALTER TABLE public.envelopes 
DROP CONSTRAINT IF EXISTS envelopes_notify_amount_positive;

-- Add new constraints with updated names
ALTER TABLE public.envelopes 
ADD CONSTRAINT envelopes_notify_above_amount_positive 
    CHECK (notify_above_amount IS NULL OR notify_above_amount > 0);

ALTER TABLE public.envelopes 
ADD CONSTRAINT envelopes_notify_below_amount_positive 
    CHECK (notify_below_amount IS NULL OR notify_below_amount > 0);

-- Update the notification requirement constraint to use new column names
ALTER TABLE public.envelopes 
DROP CONSTRAINT IF EXISTS envelopes_notification_required;

ALTER TABLE public.envelopes 
ADD CONSTRAINT envelopes_notification_required 
    CHECK (
        (should_notify = false) OR 
        (should_notify = true AND (
            notify_date IS NOT NULL OR 
            notify_below_amount IS NOT NULL OR 
            notify_above_amount IS NOT NULL
        ))
    );

-- Update column comments for clarity
COMMENT ON COLUMN public.envelopes.notify_above_amount IS 'Alert when envelope balance reaches or exceeds this amount';
COMMENT ON COLUMN public.envelopes.notify_below_amount IS 'Alert when envelope balance falls below this amount';

-- Update table comment to reflect the new notification system
COMMENT ON TABLE public.envelopes IS 'Envelope budgeting containers with flexible notification thresholds (above/below amounts and dates)';