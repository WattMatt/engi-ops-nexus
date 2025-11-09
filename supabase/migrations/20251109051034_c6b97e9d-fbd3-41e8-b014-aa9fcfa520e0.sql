-- Add color column to generator_zones table
ALTER TABLE public.generator_zones
ADD COLUMN zone_color TEXT DEFAULT '#3b82f6';