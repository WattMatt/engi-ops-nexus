-- Add DELETE policy for floor_plans table
CREATE POLICY "Users can delete floor plans in their projects"
ON public.floor_plans FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = floor_plans.project_id
    AND project_members.user_id = auth.uid()
  )
);