-- Migration: Add icon and color columns to envelopes table
-- Adds UI customization fields to envelopes table

-- Add icon and color columns to envelopes table
ALTER TABLE public.envelopes 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'wallet',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10B981';