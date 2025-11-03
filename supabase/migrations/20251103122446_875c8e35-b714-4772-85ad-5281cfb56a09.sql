-- Create generator zones table
CREATE TABLE IF NOT EXISTS public.generator_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  zone_name TEXT NOT NULL,
  zone_number INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add zone_id to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS generator_zone_id UUID REFERENCES public.generator_zones(id);

-- Enable RLS
ALTER TABLE public.generator_zones ENABLE ROW LEVEL SECURITY;

-- RLS policies for generator_zones
CREATE POLICY "Users can view zones for their projects"
  ON public.generator_zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = generator_zones.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert zones for their projects"
  ON public.generator_zones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = generator_zones.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update zones for their projects"
  ON public.generator_zones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = generator_zones.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete zones for their projects"
  ON public.generator_zones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = generator_zones.project_id
      AND project_members.user_id = auth.uid()
    )
  );