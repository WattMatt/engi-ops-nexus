-- Add zone_id column to project_lighting_schedules for zone-based fitting assignment
ALTER TABLE public.project_lighting_schedules 
ADD COLUMN zone_id UUID REFERENCES public.lighting_zones(id) ON DELETE SET NULL;