
-- 1. cable_entries: Allow anon SELECT via contractor/client portal token (join through cable_schedules)
CREATE POLICY "Anon can view cable entries with valid portal token"
ON public.cable_entries FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.cable_schedules cs
    WHERE cs.id = cable_entries.schedule_id
    AND (has_valid_client_portal_token(cs.project_id) OR has_valid_contractor_portal_token(cs.project_id))
  )
  OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects fp
    WHERE fp.id = cable_entries.floor_plan_id
    AND (has_valid_client_portal_token(fp.project_id) OR has_valid_contractor_portal_token(fp.project_id))
  )
);

-- 2. floor_plan_projects: Allow anon SELECT via portal tokens
CREATE POLICY "Anon can view floor plan projects with valid portal token"
ON public.floor_plan_projects FOR SELECT TO anon
USING (
  has_valid_client_portal_token(project_id) OR has_valid_contractor_portal_token(project_id)
);
