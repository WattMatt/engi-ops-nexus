
-- Step 1: Create security helper function
CREATE OR REPLACE FUNCTION public.has_valid_contractor_portal_token(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contractor_portal_tokens
    WHERE project_id = p_project_id
      AND is_active = true
      AND expires_at > now()
  );
$$;

-- Step 2: Add anon SELECT policies

CREATE POLICY "Anon contractor view drawings"
ON public.project_drawings FOR SELECT TO anon
USING (has_valid_contractor_portal_token(project_id));

CREATE POLICY "Anon contractor view revisions"
ON public.drawing_revisions FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM project_drawings pd
    WHERE pd.id = drawing_revisions.drawing_id
      AND has_valid_contractor_portal_token(pd.project_id)
  )
);

CREATE POLICY "Anon contractor view cable schedules"
ON public.cable_schedules FOR SELECT TO anon
USING (has_valid_contractor_portal_token(project_id));

CREATE POLICY "Anon contractor view floor plan zones"
ON public.floor_plan_zones FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM floor_plan_projects fp
    WHERE fp.id = floor_plan_zones.floor_plan_id
      AND has_valid_contractor_portal_token(fp.project_id)
  )
);

CREATE POLICY "Anon contractor view procurement items"
ON public.project_procurement_items FOR SELECT TO anon
USING (has_valid_contractor_portal_token(project_id));

CREATE POLICY "Anon contractor view rfis"
ON public.rfis FOR SELECT TO anon
USING (has_valid_contractor_portal_token(project_id));

CREATE POLICY "Anon contractor view inspections"
ON public.inspection_requests FOR SELECT TO anon
USING (has_valid_contractor_portal_token(project_id));
