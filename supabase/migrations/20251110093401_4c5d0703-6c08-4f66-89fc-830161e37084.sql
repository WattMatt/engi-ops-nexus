-- Update project_members policies to allow all authenticated users to manage members
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can add project members" ON project_members;
DROP POLICY IF EXISTS "Users can remove project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can manage members" ON project_members;

-- All authenticated users can view project members
CREATE POLICY "All authenticated users can view project members"
ON project_members FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can add project members
CREATE POLICY "All authenticated users can add project members"
ON project_members FOR INSERT
TO authenticated
WITH CHECK (true);

-- All authenticated users can update project members
CREATE POLICY "All authenticated users can update project members"
ON project_members FOR UPDATE
TO authenticated
USING (true);

-- All authenticated users can remove project members
CREATE POLICY "All authenticated users can remove project members"
ON project_members FOR DELETE
TO authenticated
USING (true);