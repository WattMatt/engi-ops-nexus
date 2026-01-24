
-- Fix Bulk Services RLS inconsistency - make all tables accessible to authenticated users

-- Drop existing restrictive policies on workflow tables
DROP POLICY IF EXISTS "Users can manage workflow phases for their projects" ON bulk_services_workflow_phases;
DROP POLICY IF EXISTS "Users can view workflow phases for their projects" ON bulk_services_workflow_phases;
DROP POLICY IF EXISTS "Users can manage workflow tasks for their projects" ON bulk_services_workflow_tasks;
DROP POLICY IF EXISTS "Users can view workflow tasks for their projects" ON bulk_services_workflow_tasks;
DROP POLICY IF EXISTS "Users can manage workflow snapshots for their projects" ON bulk_services_workflow_snapshots;
DROP POLICY IF EXISTS "Users can view workflow snapshots for their projects" ON bulk_services_workflow_snapshots;

-- Create simple authenticated user policies matching other bulk services tables
CREATE POLICY "auth_full_access" ON bulk_services_workflow_phases
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_full_access" ON bulk_services_workflow_tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_full_access" ON bulk_services_workflow_snapshots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
