-- Add db_by_tenant and lighting_by_tenant fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS db_by_tenant BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lighting_by_tenant BOOLEAN DEFAULT false;