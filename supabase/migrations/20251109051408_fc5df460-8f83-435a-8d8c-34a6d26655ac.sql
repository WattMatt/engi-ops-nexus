-- Add manual kW override column to tenants table
ALTER TABLE public.tenants
ADD COLUMN manual_kw_override NUMERIC;