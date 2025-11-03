-- Add generator-related fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS own_generator_provided boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS generator_loading_sector_1 numeric(10,2),
ADD COLUMN IF NOT EXISTS generator_loading_sector_2 numeric(10,2);

-- Add comment to describe the columns
COMMENT ON COLUMN public.tenants.own_generator_provided IS 'Whether the tenant provides their own generator';
COMMENT ON COLUMN public.tenants.generator_loading_sector_1 IS 'Generator loading in kW for Sector 1';
COMMENT ON COLUMN public.tenants.generator_loading_sector_2 IS 'Generator loading in kW for Sector 2';