-- Add logo columns to electrical_budgets table
ALTER TABLE public.electrical_budgets
ADD COLUMN consultant_logo_url TEXT,
ADD COLUMN client_logo_url TEXT;