-- Add cost_reported column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS cost_reported boolean DEFAULT false;