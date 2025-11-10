-- Update tenants table policies to restrict members to read-only
DROP POLICY IF EXISTS "Users can manage tenants in their projects" ON tenants;

-- Members can only view tenants
CREATE POLICY "Members can view tenants in their projects"
ON tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tenants.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- Only owners, editors, and admins can insert tenants
CREATE POLICY "Owners and editors can create tenants"
ON tenants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tenants.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  )
  OR has_role(auth.uid(), 'admin')
);

-- Only owners, editors, and admins can update tenants
CREATE POLICY "Owners and editors can update tenants"
ON tenants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tenants.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  )
  OR has_role(auth.uid(), 'admin')
);

-- Only owners, editors, and admins can delete tenants
CREATE POLICY "Owners and editors can delete tenants"
ON tenants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tenants.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  )
  OR has_role(auth.uid(), 'admin')
);

-- Update cost_reports policies
DROP POLICY IF EXISTS "Users can create cost reports for their projects" ON cost_reports;
DROP POLICY IF EXISTS "Users can update cost reports for their projects" ON cost_reports;
DROP POLICY IF EXISTS "Users can delete cost reports for their projects" ON cost_reports;

CREATE POLICY "Owners and editors can create cost reports"
ON cost_reports
FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = cost_reports.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  ) OR has_role(auth.uid(), 'admin'))
  AND created_by = auth.uid()
);

CREATE POLICY "Owners and editors can update cost reports"
ON cost_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = cost_reports.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owners and editors can delete cost reports"
ON cost_reports
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = cost_reports.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  )
  OR has_role(auth.uid(), 'admin')
);

-- Update cable_schedules policies
DROP POLICY IF EXISTS "Users can create cable schedules for their projects" ON cable_schedules;
DROP POLICY IF EXISTS "Users can update cable schedules for their projects" ON cable_schedules;
DROP POLICY IF EXISTS "Users can delete cable schedules for their projects" ON cable_schedules;

CREATE POLICY "Owners and editors can create cable schedules"
ON cable_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = cable_schedules.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  ) OR has_role(auth.uid(), 'admin'))
  AND created_by = auth.uid()
);

CREATE POLICY "Owners and editors can update cable schedules"
ON cable_schedules
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = cable_schedules.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owners and editors can delete cable schedules"
ON cable_schedules
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = cable_schedules.project_id
    AND project_members.user_id = auth.uid()
    AND project_members.role IN ('owner', 'editor')
  )
  OR has_role(auth.uid(), 'admin')
);

-- Update budgets policies (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'budgets') THEN
    DROP POLICY IF EXISTS "Users can create budgets for their projects" ON budgets;
    DROP POLICY IF EXISTS "Users can update budgets for their projects" ON budgets;
    DROP POLICY IF EXISTS "Users can delete budgets for their projects" ON budgets;
    
    CREATE POLICY "Owners and editors can create budgets"
    ON budgets
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = budgets.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('owner', 'editor')
      ) OR has_role(auth.uid(), 'admin'))
      AND created_by = auth.uid()
    );
    
    CREATE POLICY "Owners and editors can update budgets"
    ON budgets
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = budgets.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('owner', 'editor')
      )
      OR has_role(auth.uid(), 'admin')
    );
    
    CREATE POLICY "Owners and editors can delete budgets"
    ON budgets
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = budgets.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('owner', 'editor')
      )
      OR has_role(auth.uid(), 'admin')
    );
  END IF;
END $$;