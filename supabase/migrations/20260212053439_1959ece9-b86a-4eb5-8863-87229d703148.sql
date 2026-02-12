-- Drop existing anon policy on projects
DROP POLICY IF EXISTS "Public can view projects with valid portal token" ON public.projects;

-- Create new policy that allows anon access via EITHER client or contractor portal tokens
CREATE POLICY "Anon can view projects with valid portal token"
ON public.projects
FOR SELECT
TO anon
USING (
  has_valid_client_portal_token(id) OR has_valid_contractor_portal_token(id)
);