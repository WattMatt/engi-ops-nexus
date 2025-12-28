-- Add project_id column to floor_plan_reports to enable project-specific filtering
ALTER TABLE public.floor_plan_reports
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Create index for efficient filtering by project
CREATE INDEX idx_floor_plan_reports_project_id ON public.floor_plan_reports(project_id);