-- Migration: Add missing columns for notifications and payee tracking
-- Description: Add missing columns to envelopes and payees tables

-- Add low balance notification columns to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN IF NOT EXISTS notify_on_low_balance BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS low_balance_threshold DECIMAL(12, 2);

-- Add payee tracking columns (total_paid and last_payment_date)
ALTER TABLE public.payees 
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Add helpful comments
COMMENT ON COLUMN public.envelopes.notify_on_low_balance IS 'Whether to send notifications when envelope balance is low';
COMMENT ON COLUMN public.envelopes.low_balance_threshold IS 'Threshold amount below which low balance notifications are sent';
COMMENT ON COLUMN public.payees.total_paid IS 'Total amount paid to this payee';
COMMENT ON COLUMN public.payees.last_payment_date IS 'Date of the most recent payment to this payee';