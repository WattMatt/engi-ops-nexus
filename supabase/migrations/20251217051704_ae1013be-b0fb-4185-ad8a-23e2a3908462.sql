-- Add image_url column to lighting_fittings table
ALTER TABLE public.lighting_fittings 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.lighting_fittings.image_url IS 'URL to the fitting thumbnail/product image';