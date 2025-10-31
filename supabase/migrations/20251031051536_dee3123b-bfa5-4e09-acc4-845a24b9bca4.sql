-- Add db_size_scope_of_work column to db_sizing_rules table
-- Rename existing db_size to db_size_allowance for clarity
ALTER TABLE public.db_sizing_rules 
  RENAME COLUMN db_size TO db_size_allowance;

-- Add new column for scope of work DB size (initially null, can be set later)
ALTER TABLE public.db_sizing_rules 
  ADD COLUMN db_size_scope_of_work TEXT;