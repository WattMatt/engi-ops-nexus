-- Add GPS location fields to cable_schedule_verifications table
ALTER TABLE public.cable_schedule_verifications
ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_captured_at TIMESTAMP WITH TIME ZONE;

-- Add GPS location fields to cable_verification_items for per-cable location tracking
ALTER TABLE public.cable_verification_items
ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION;

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_verifications_location 
ON public.cable_schedule_verifications (location_latitude, location_longitude) 
WHERE location_latitude IS NOT NULL;