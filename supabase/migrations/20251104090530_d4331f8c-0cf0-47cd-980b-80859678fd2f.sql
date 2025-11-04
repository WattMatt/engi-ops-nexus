-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own floor plans" ON public.floor_plan_projects;

-- Create a new policy that allows users to view:
-- 1. Their own floor plans
-- 2. Floor plans for projects they are members of
CREATE POLICY "Users can view floor plans for their projects"
ON public.floor_plan_projects
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  (
    project_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM project_members 
      WHERE project_members.project_id = floor_plan_projects.project_id 
      AND project_members.user_id = auth.uid()
    )
  )
);