-- Revert to open access for all authenticated users on content tables
-- Project membership is only for messaging/collaboration features

-- TENANTS: All authenticated users have full access
DROP POLICY IF EXISTS "Members can view tenants in their projects" ON tenants;
DROP POLICY IF EXISTS "Owners and editors can create tenants" ON tenants;
DROP POLICY IF EXISTS "Owners and editors can update tenants" ON tenants;
DROP POLICY IF EXISTS "Owners and editors can delete tenants" ON tenants;

CREATE POLICY "All authenticated users can view tenants"
ON tenants FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can create tenants"
ON tenants FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "All authenticated users can update tenants"
ON tenants FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can delete tenants"
ON tenants FOR DELETE
TO authenticated
USING (true);

-- COST REPORTS: All authenticated users have full access
DROP POLICY IF EXISTS "Users can view cost reports for their projects" ON cost_reports;
DROP POLICY IF EXISTS "Owners and editors can create cost reports" ON cost_reports;
DROP POLICY IF EXISTS "Owners and editors can update cost reports" ON cost_reports;
DROP POLICY IF EXISTS "Owners and editors can delete cost reports" ON cost_reports;

CREATE POLICY "All authenticated users can view cost reports"
ON cost_reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can create cost reports"
ON cost_reports FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "All authenticated users can update cost reports"
ON cost_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can delete cost reports"
ON cost_reports FOR DELETE
TO authenticated
USING (true);

-- CABLE SCHEDULES: All authenticated users have full access
DROP POLICY IF EXISTS "Users can view cable schedules for their projects" ON cable_schedules;
DROP POLICY IF EXISTS "Owners and editors can create cable schedules" ON cable_schedules;
DROP POLICY IF EXISTS "Owners and editors can update cable schedules" ON cable_schedules;
DROP POLICY IF EXISTS "Owners and editors can delete cable schedules" ON cable_schedules;

CREATE POLICY "All authenticated users can view cable schedules"
ON cable_schedules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can create cable schedules"
ON cable_schedules FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "All authenticated users can update cable schedules"
ON cable_schedules FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can delete cable schedules"
ON cable_schedules FOR DELETE
TO authenticated
USING (true);

-- BUDGETS: All authenticated users have full access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budgets') THEN
    DROP POLICY IF EXISTS "Users can view budgets for their projects" ON budgets;
    DROP POLICY IF EXISTS "Owners and editors can create budgets" ON budgets;
    DROP POLICY IF EXISTS "Owners and editors can update budgets" ON budgets;
    DROP POLICY IF EXISTS "Owners and editors can delete budgets" ON budgets;
    
    EXECUTE 'CREATE POLICY "All authenticated users can view budgets" ON budgets FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can create budgets" ON budgets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())';
    EXECUTE 'CREATE POLICY "All authenticated users can update budgets" ON budgets FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can delete budgets" ON budgets FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- SPECIFICATIONS: All authenticated users have full access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'specifications') THEN
    DROP POLICY IF EXISTS "Users can view specifications for their projects" ON specifications;
    DROP POLICY IF EXISTS "Users can create specifications for their projects" ON specifications;
    DROP POLICY IF EXISTS "Users can update specifications for their projects" ON specifications;
    DROP POLICY IF EXISTS "Users can delete specifications for their projects" ON specifications;
    
    EXECUTE 'CREATE POLICY "All authenticated users can view specifications" ON specifications FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can create specifications" ON specifications FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())';
    EXECUTE 'CREATE POLICY "All authenticated users can update specifications" ON specifications FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can delete specifications" ON specifications FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- FINAL ACCOUNTS: All authenticated users have full access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'final_accounts') THEN
    DROP POLICY IF EXISTS "Users can view final accounts for their projects" ON final_accounts;
    DROP POLICY IF EXISTS "Users can create final accounts for their projects" ON final_accounts;
    DROP POLICY IF EXISTS "Users can update final accounts for their projects" ON final_accounts;
    DROP POLICY IF EXISTS "Users can delete final accounts for their projects" ON final_accounts;
    
    EXECUTE 'CREATE POLICY "All authenticated users can view final accounts" ON final_accounts FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can create final accounts" ON final_accounts FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())';
    EXECUTE 'CREATE POLICY "All authenticated users can update final accounts" ON final_accounts FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can delete final accounts" ON final_accounts FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;

-- PROJECT OUTLINES: All authenticated users have full access (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_outlines') THEN
    DROP POLICY IF EXISTS "Users can view project outlines for their projects" ON project_outlines;
    DROP POLICY IF EXISTS "Users can create project outlines for their projects" ON project_outlines;
    DROP POLICY IF EXISTS "Users can update project outlines for their projects" ON project_outlines;
    DROP POLICY IF EXISTS "Users can delete project outlines for their projects" ON project_outlines;
    
    EXECUTE 'CREATE POLICY "All authenticated users can view project outlines" ON project_outlines FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can create project outlines" ON project_outlines FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())';
    EXECUTE 'CREATE POLICY "All authenticated users can update project outlines" ON project_outlines FOR UPDATE TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "All authenticated users can delete project outlines" ON project_outlines FOR DELETE TO authenticated USING (true)';
  END IF;
END $$;