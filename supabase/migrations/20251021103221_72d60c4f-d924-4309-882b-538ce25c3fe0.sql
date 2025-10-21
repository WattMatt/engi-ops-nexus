-- Drop all existing policies for cost_line_items
DROP POLICY IF EXISTS "Users can manage line items in their cost reports" ON public.cost_line_items;
DROP POLICY IF EXISTS "Users can view line items in their cost reports" ON public.cost_line_items;
DROP POLICY IF EXISTS "Users can insert line items in their cost reports" ON public.cost_line_items;
DROP POLICY IF EXISTS "Users can update line items in their cost reports" ON public.cost_line_items;
DROP POLICY IF EXISTS "Users can delete line items in their cost reports" ON public.cost_line_items;

-- Create separate policies for better control
CREATE POLICY "Users can view line items in their cost reports"
ON public.cost_line_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM cost_categories cc
    JOIN cost_reports cr ON cr.id = cc.cost_report_id
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cc.id = cost_line_items.category_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert line items in their cost reports"
ON public.cost_line_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM cost_categories cc
    JOIN cost_reports cr ON cr.id = cc.cost_report_id
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cc.id = cost_line_items.category_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update line items in their cost reports"
ON public.cost_line_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM cost_categories cc
    JOIN cost_reports cr ON cr.id = cc.cost_report_id
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cc.id = cost_line_items.category_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete line items in their cost reports"
ON public.cost_line_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM cost_categories cc
    JOIN cost_reports cr ON cr.id = cc.cost_report_id
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cc.id = cost_line_items.category_id
    AND pm.user_id = auth.uid()
  )
);