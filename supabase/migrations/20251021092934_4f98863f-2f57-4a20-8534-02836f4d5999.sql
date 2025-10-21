-- Add fields to projects table that should be at project level
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS project_number TEXT,
ADD COLUMN IF NOT EXISTS site_handover_date DATE,
ADD COLUMN IF NOT EXISTS practical_completion_date DATE,
ADD COLUMN IF NOT EXISTS electrical_contractor TEXT,
ADD COLUMN IF NOT EXISTS earthing_contractor TEXT,
ADD COLUMN IF NOT EXISTS standby_plants_contractor TEXT,
ADD COLUMN IF NOT EXISTS cctv_contractor TEXT,
ADD COLUMN IF NOT EXISTS project_logo_url TEXT,
ADD COLUMN IF NOT EXISTS client_logo_url TEXT;

-- Make project_number unique per project if it exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_project_number 
ON public.projects(project_number) 
WHERE project_number IS NOT NULL;