-- Add scale_pixels_per_meter column to project_floor_plans table
ALTER TABLE public.project_floor_plans 
ADD COLUMN IF NOT EXISTS scale_pixels_per_meter numeric;