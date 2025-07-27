-- Migration: Core Entity Tables
-- Creates budgets, categories, income_sources, payees, and envelopes tables

-- Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  available_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT budgets_available_amount_non_negative CHECK (available_amount >= 0)
);

-- Create index for user_id lookups
CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX idx_budgets_user_id_active ON public.budgets(user_id) WHERE is_active = true;

-- Enable RLS on budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies for budgets
CREATE POLICY "Users can view their own budgets" 
  ON public.budgets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets" 
  ON public.budgets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" 
  ON public.budgets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" 
  ON public.budgets 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create categories table with self-referential hierarchy
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_income BOOLEAN DEFAULT false NOT NULL,
  is_system BOOLEAN DEFAULT false NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT categories_no_self_parent CHECK (id != parent_id)
);

-- Create indexes for categories
CREATE INDEX idx_categories_budget_id ON public.categories(budget_id);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_categories_budget_id_is_income ON public.categories(budget_id, is_income);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories (inherit budget access)
CREATE POLICY "Users can view categories in their budgets" 
  ON public.categories 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = categories.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create categories in their budgets" 
  ON public.categories 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = categories.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can update categories in their budgets" 
  ON public.categories 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = categories.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete categories in their budgets" 
  ON public.categories 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = categories.budget_id 
    AND budgets.user_id = auth.uid()
  ));

-- Create income_sources table
CREATE TABLE IF NOT EXISTS public.income_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  expected_amount DECIMAL(12, 2),
  frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'one-time')),
  next_expected_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for income_sources
CREATE INDEX idx_income_sources_budget_id ON public.income_sources(budget_id);
CREATE INDEX idx_income_sources_category_id ON public.income_sources(category_id);
CREATE INDEX idx_income_sources_next_expected_date ON public.income_sources(next_expected_date) WHERE is_active = true;

-- Enable RLS on income_sources
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

-- RLS policies for income_sources
CREATE POLICY "Users can view income sources in their budgets" 
  ON public.income_sources 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = income_sources.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create income sources in their budgets" 
  ON public.income_sources 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = income_sources.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can update income sources in their budgets" 
  ON public.income_sources 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = income_sources.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete income sources in their budgets" 
  ON public.income_sources 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = income_sources.budget_id 
    AND budgets.user_id = auth.uid()
  ));

-- Create payees table
CREATE TABLE IF NOT EXISTS public.payees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for payees
CREATE INDEX idx_payees_budget_id ON public.payees(budget_id);
CREATE INDEX idx_payees_category_id ON public.payees(category_id);
CREATE INDEX idx_payees_budget_id_name ON public.payees(budget_id, name);

-- Enable RLS on payees
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;

-- RLS policies for payees
CREATE POLICY "Users can view payees in their budgets" 
  ON public.payees 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = payees.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create payees in their budgets" 
  ON public.payees 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = payees.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can update payees in their budgets" 
  ON public.payees 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = payees.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete payees in their budgets" 
  ON public.payees 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = payees.budget_id 
    AND budgets.user_id = auth.uid()
  ));

-- Create envelopes table with balance tracking
CREATE TABLE IF NOT EXISTS public.envelopes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  current_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  target_amount DECIMAL(12, 2),
  target_date DATE,
  fill_type TEXT DEFAULT 'manual' CHECK (fill_type IN ('manual', 'percentage', 'fixed_amount')),
  fill_amount DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for envelopes
CREATE INDEX idx_envelopes_budget_id ON public.envelopes(budget_id);
CREATE INDEX idx_envelopes_category_id ON public.envelopes(category_id);
CREATE INDEX idx_envelopes_budget_id_active ON public.envelopes(budget_id) WHERE is_active = true;
CREATE INDEX idx_envelopes_negative_balance ON public.envelopes(budget_id) WHERE current_balance < 0;

-- Enable RLS on envelopes
ALTER TABLE public.envelopes ENABLE ROW LEVEL SECURITY;

-- RLS policies for envelopes
CREATE POLICY "Users can view envelopes in their budgets" 
  ON public.envelopes 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = envelopes.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create envelopes in their budgets" 
  ON public.envelopes 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = envelopes.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can update envelopes in their budgets" 
  ON public.envelopes 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = envelopes.budget_id 
    AND budgets.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete envelopes in their budgets" 
  ON public.envelopes 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE budgets.id = envelopes.budget_id 
    AND budgets.user_id = auth.uid()
  ));

-- Add triggers for auto-updating updated_at
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_income_sources_updated_at
  BEFORE UPDATE ON public.income_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payees_updated_at
  BEFORE UPDATE ON public.payees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_envelopes_updated_at
  BEFORE UPDATE ON public.envelopes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();