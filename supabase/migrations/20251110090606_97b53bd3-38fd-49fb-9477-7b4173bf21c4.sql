-- Fix RLS policy for tenants table to allow INSERT operations
-- The existing policy has no WITH CHECK clause, causing INSERT to fail

DROP POLICY IF EXISTS "Users can manage tenants in their projects" ON public.tenants;

-- Recreate the policy with proper WITH CHECK clause
CREATE POLICY "Users can manage tenants in their projects"
ON public.tenants
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_members.project_id = tenants.project_id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_members.project_id = tenants.project_id
    AND project_members.user_id = auth.uid()
  )
);