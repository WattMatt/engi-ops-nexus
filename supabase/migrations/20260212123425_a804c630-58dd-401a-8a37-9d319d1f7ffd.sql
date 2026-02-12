
-- 1. tenant_floor_plan_zones: Allow anon SELECT via portal tokens
CREATE POLICY "Anon can view tenant floor plan zones with valid portal token"
ON public.tenant_floor_plan_zones FOR SELECT TO anon
USING (
  has_valid_client_portal_token(project_id) OR has_valid_contractor_portal_token(project_id)
);

-- 2. project_floor_plans: Allow anon SELECT via portal tokens
CREATE POLICY "Anon can view project floor plans with valid portal token"
ON public.project_floor_plans FOR SELECT TO anon
USING (
  has_valid_client_portal_token(project_id) OR has_valid_contractor_portal_token(project_id)
);
