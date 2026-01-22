-- Add exclusions column to electrical_budgets table
ALTER TABLE public.electrical_budgets
ADD COLUMN exclusions TEXT;