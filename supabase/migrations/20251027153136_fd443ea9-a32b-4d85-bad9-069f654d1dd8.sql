-- Add columns to store scale calibration points for visual reference
ALTER TABLE floor_plans 
ADD COLUMN IF NOT EXISTS scale_point1 jsonb,
ADD COLUMN IF NOT EXISTS scale_point2 jsonb;