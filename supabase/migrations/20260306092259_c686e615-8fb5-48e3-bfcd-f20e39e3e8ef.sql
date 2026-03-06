-- Add location_area and assignee_names to defect_pins
ALTER TABLE public.defect_pins 
  ADD COLUMN IF NOT EXISTS location_area text,
  ADD COLUMN IF NOT EXISTS assignee_names text[] DEFAULT '{}';

-- Add annotation_json to defect_photos for fabric.js annotations
ALTER TABLE public.defect_photos
  ADD COLUMN IF NOT EXISTS annotation_json jsonb;