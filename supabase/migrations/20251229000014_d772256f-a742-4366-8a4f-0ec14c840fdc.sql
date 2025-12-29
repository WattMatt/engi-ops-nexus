-- Allow circuit_id to be nullable for unassigned/general materials
ALTER TABLE public.db_circuit_materials 
ALTER COLUMN circuit_id DROP NOT NULL;

-- Add floor_plan_id column to associate unassigned materials with a floor plan
ALTER TABLE public.db_circuit_materials 
ADD COLUMN floor_plan_id UUID REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE;

-- Add project_id column to associate unassigned materials with a project
ALTER TABLE public.db_circuit_materials 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create index for efficient filtering of unassigned materials
CREATE INDEX idx_db_circuit_materials_unassigned 
ON public.db_circuit_materials(floor_plan_id, project_id) 
WHERE circuit_id IS NULL;