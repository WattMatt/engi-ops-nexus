-- Create table for tenant floor plan zones
CREATE TABLE public.tenant_floor_plan_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  zone_points JSONB NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name TEXT,
  category TEXT,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tenant_floor_plan_zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view zones for their projects"
  ON public.tenant_floor_plan_zones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tenant_floor_plan_zones.project_id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert zones for their projects"
  ON public.tenant_floor_plan_zones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tenant_floor_plan_zones.project_id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update zones for their projects"
  ON public.tenant_floor_plan_zones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tenant_floor_plan_zones.project_id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete zones for their projects"
  ON public.tenant_floor_plan_zones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tenant_floor_plan_zones.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_tenant_floor_plan_zones_updated_at
  BEFORE UPDATE ON public.tenant_floor_plan_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_tenant_floor_plan_zones_project_id 
  ON public.tenant_floor_plan_zones(project_id);