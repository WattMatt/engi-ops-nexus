-- Add deadline date columns for DB and Lighting to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS db_last_order_date date,
ADD COLUMN IF NOT EXISTS db_delivery_date date,
ADD COLUMN IF NOT EXISTS lighting_last_order_date date,
ADD COLUMN IF NOT EXISTS lighting_delivery_date date;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.db_last_order_date IS 'Auto-calculated: 40 business days before BO date for distribution boards';
COMMENT ON COLUMN public.tenants.db_delivery_date IS 'Auto-calculated: 40 business days before BO date for distribution boards delivery';
COMMENT ON COLUMN public.tenants.lighting_last_order_date IS 'Auto-calculated: 40 business days before BO date for lighting';
COMMENT ON COLUMN public.tenants.lighting_delivery_date IS 'Auto-calculated: 40 business days before BO date for lighting delivery';