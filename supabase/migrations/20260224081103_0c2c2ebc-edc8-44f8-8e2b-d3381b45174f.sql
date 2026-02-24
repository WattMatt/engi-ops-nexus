
-- Drop the overly permissive policy on generator_zones
DROP POLICY IF EXISTS "auth_full_access" ON public.generator_zones;

-- Create a proper project-member-based policy
CREATE POLICY "generator_zones_project_access" ON public.generator_zones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = generator_zones.project_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
  OR has_valid_client_portal_token(project_id)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = generator_zones.project_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);

-- Keep the existing client portal read policy
-- (already exists: "Public can view generator_zones with valid portal token")
