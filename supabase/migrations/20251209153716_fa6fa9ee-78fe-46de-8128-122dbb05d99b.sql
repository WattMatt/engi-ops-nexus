-- Drop the incorrect RLS policy
DROP POLICY IF EXISTS "zone_generators_all" ON public.zone_generators;

-- Create correct RLS policy that references generator_zones table
CREATE POLICY "zone_generators_project_access"
ON public.zone_generators
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM generator_zones gz
    JOIN projects p ON p.id = gz.project_id
    WHERE gz.id = zone_generators.zone_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM generator_zones gz
    JOIN projects p ON p.id = gz.project_id
    WHERE gz.id = zone_generators.zone_id
    AND (
      p.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  )
);