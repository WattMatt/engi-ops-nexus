-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  shop_number TEXT NOT NULL,
  area NUMERIC,
  db_size TEXT,
  sow_received BOOLEAN DEFAULT false,
  layout_received BOOLEAN DEFAULT false,
  db_ordered BOOLEAN DEFAULT false,
  db_cost NUMERIC,
  lighting_ordered BOOLEAN DEFAULT false,
  lighting_cost NUMERIC,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  zone_points JSONB,
  zone_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view tenants in their projects"
  ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tenants.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tenants in their projects"
  ON public.tenants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tenants.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create tenant_field_config table for customizable fields
CREATE TABLE public.tenant_field_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  field_order JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.tenant_field_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view field config for their projects"
  ON public.tenant_field_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tenant_field_config.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage field config for their projects"
  ON public.tenant_field_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tenant_field_config.project_id
      AND project_members.user_id = auth.uid()
    )
  );