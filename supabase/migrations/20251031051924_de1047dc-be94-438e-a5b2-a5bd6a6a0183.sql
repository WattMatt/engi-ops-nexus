-- Add separate DB size columns to tenants table
-- Rename existing db_size to db_size_allowance for clarity
ALTER TABLE public.tenants 
  RENAME COLUMN db_size TO db_size_allowance;

-- Add new column for scope of work DB size
ALTER TABLE public.tenants 
  ADD COLUMN db_size_scope_of_work TEXT;