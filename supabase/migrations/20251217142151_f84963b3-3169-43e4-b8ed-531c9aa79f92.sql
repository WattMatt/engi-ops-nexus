-- Add column to store multiple wattage/lumen variants
ALTER TABLE public.lighting_fittings 
ADD COLUMN IF NOT EXISTS wattage_variants JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.lighting_fittings.wattage_variants IS 'Array of {wattage: number, lumen_output: number, color_temperature?: number} objects for fittings with multiple power options';