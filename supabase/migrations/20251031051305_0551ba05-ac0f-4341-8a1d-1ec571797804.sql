-- Create project_floor_plans table for persistent floor plan storage
CREATE TABLE IF NOT EXISTS public.project_floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE,
  base_pdf_url TEXT,
  composite_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_floor_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view floor plans for their projects"
  ON public.project_floor_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_floor_plans.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert floor plans for their projects"
  ON public.project_floor_plans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_floor_plans.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update floor plans for their projects"
  ON public.project_floor_plans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_floor_plans.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete floor plans for their projects"
  ON public.project_floor_plans
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_floor_plans.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_project_floor_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_floor_plans_updated_at
  BEFORE UPDATE ON public.project_floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_project_floor_plans_updated_at();