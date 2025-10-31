-- Create table for DB sizing rules
CREATE TABLE IF NOT EXISTS public.db_sizing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  min_area DECIMAL(10,2) NOT NULL,
  max_area DECIMAL(10,2) NOT NULL,
  db_size TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_area_range UNIQUE (project_id, min_area, max_area)
);

-- Enable RLS
ALTER TABLE public.db_sizing_rules ENABLE ROW LEVEL SECURITY;

-- Create policies - allow project members to manage rules
CREATE POLICY "Users can view DB sizing rules for their projects"
  ON public.db_sizing_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = db_sizing_rules.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert DB sizing rules for their projects"
  ON public.db_sizing_rules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = db_sizing_rules.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update DB sizing rules for their projects"
  ON public.db_sizing_rules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = db_sizing_rules.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete DB sizing rules for their projects"
  ON public.db_sizing_rules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = db_sizing_rules.project_id
      AND project_members.user_id = auth.uid()
    )
  );