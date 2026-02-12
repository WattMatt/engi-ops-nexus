
-- Fix tenants table: add contractor portal token access for anon role
DROP POLICY IF EXISTS "Public can view tenants with valid portal token" ON public.tenants;
CREATE POLICY "Anon can view tenants with valid portal token"
ON public.tenants FOR SELECT TO anon
USING (
  has_valid_client_portal_token(project_id) OR has_valid_contractor_portal_token(project_id)
);
