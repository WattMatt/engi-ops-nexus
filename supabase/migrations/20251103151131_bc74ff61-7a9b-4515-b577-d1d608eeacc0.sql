-- Add tenant_rate column to generator_settings table
ALTER TABLE public.generator_settings
ADD COLUMN IF NOT EXISTS tenant_rate numeric DEFAULT 0;