-- Add dimmable column to lighting_fittings table
ALTER TABLE public.lighting_fittings ADD COLUMN IF NOT EXISTS dimmable boolean DEFAULT false;