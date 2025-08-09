-- Migration: Set icon columns to default NULL
-- Updates icon columns in categories and envelopes tables to use NULL default instead of emoji/predefined values

-- Update categories table icon column to default NULL
ALTER TABLE public.categories 
ALTER COLUMN icon SET DEFAULT NULL;

-- Update envelopes table icon column to default NULL  
ALTER TABLE public.envelopes 
ALTER COLUMN icon SET DEFAULT NULL;

-- Optionally clear existing emoji icons (uncomment if desired)
-- UPDATE public.categories SET icon = NULL WHERE icon IN ('📁', '💰', '🏠', '🚗', '🛒', '💡', '🎉', '💊', '✈️', '📱');
-- UPDATE public.envelopes SET icon = NULL WHERE icon IN ('💰', 'wallet');