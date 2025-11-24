-- Add RLS policies for project_floor_plans table
-- Users can view floor plans for their project
CREATE POLICY "Users can view floor plans for their project"
  ON public.project_floor_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_floor_plans.project_id
    )
  );

-- Users can insert floor plans for their project
CREATE POLICY "Users can insert floor plans for their project"
  ON public.project_floor_plans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_floor_plans.project_id
    )
  );

-- Users can update floor plans for their project
CREATE POLICY "Users can update floor plans for their project"
  ON public.project_floor_plans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_floor_plans.project_id
    )
  );

-- Users can delete floor plans for their project
CREATE POLICY "Users can delete floor plans for their project"
  ON public.project_floor_plans
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_floor_plans.project_id
    )
  );