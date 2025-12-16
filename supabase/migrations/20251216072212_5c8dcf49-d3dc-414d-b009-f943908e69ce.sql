-- Add warranty_period to lighting_fittings
ALTER TABLE public.lighting_fittings 
ADD COLUMN IF NOT EXISTS warranty_years integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS warranty_terms text;

-- Add spec_sheet_url to lighting_fittings for linking data sheets
ALTER TABLE public.lighting_fittings 
ADD COLUMN IF NOT EXISTS spec_sheet_url text;

COMMENT ON COLUMN public.lighting_fittings.warranty_years IS 'Warranty period in years';
COMMENT ON COLUMN public.lighting_fittings.warranty_terms IS 'Warranty terms and conditions';
COMMENT ON COLUMN public.lighting_fittings.spec_sheet_url IS 'URL to spec sheet/data sheet PDF';