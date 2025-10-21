-- Drop existing policies for cost_categories
DROP POLICY IF EXISTS "Users can manage categories in their cost reports" ON public.cost_categories;
DROP POLICY IF EXISTS "Users can view categories in their cost reports" ON public.cost_categories;

-- Create separate policies for better control
CREATE POLICY "Users can view categories in their cost reports"
ON public.cost_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM cost_reports cr
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cr.id = cost_categories.cost_report_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert categories in their cost reports"
ON public.cost_categories
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM cost_reports cr
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cr.id = cost_categories.cost_report_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update categories in their cost reports"
ON public.cost_categories
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM cost_reports cr
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cr.id = cost_categories.cost_report_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete categories in their cost reports"
ON public.cost_categories
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM cost_reports cr
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cr.id = cost_categories.cost_report_id
    AND pm.user_id = auth.uid()
  )
);