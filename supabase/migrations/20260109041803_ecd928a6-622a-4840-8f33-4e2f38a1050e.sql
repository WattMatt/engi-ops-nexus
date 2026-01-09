-- Add latitude and longitude columns to projects table for map pin locations
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_projects_location ON public.projects (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON COLUMN public.projects.latitude IS 'Project site latitude coordinate';
COMMENT ON COLUMN public.projects.longitude IS 'Project site longitude coordinate';