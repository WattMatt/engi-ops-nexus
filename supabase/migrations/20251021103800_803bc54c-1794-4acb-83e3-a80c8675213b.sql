-- Drop and recreate INSERT policy with explicit role targeting
DROP POLICY IF EXISTS "Users can insert categories in their cost reports" ON public.cost_categories;

CREATE POLICY "Users can insert categories in their cost reports"
ON public.cost_categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM cost_reports cr
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cr.id = cost_categories.cost_report_id
    AND pm.user_id = auth.uid()
  )
);