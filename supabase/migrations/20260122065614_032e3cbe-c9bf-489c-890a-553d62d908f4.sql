-- Add baseline allowances text field to electrical_budgets
ALTER TABLE public.electrical_budgets 
ADD COLUMN baseline_allowances TEXT;