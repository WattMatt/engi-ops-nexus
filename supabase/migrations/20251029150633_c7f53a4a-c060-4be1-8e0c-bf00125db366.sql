-- Allow all authenticated users to create projects

DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "All users can create projects" ON projects;

-- Allow any authenticated user to create a project
CREATE POLICY "All users can create projects"
ON projects
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

-- Ensure users can view projects they're members of
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
CREATE POLICY "Users can view their projects"
ON projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
);

-- Users can update projects they're members of
DROP POLICY IF EXISTS "Users can update their projects" ON projects;
CREATE POLICY "Users can update their projects"
ON projects
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
);

-- Users can delete projects they own
DROP POLICY IF EXISTS "Users can delete their projects" ON projects;
CREATE POLICY "Project owners can delete projects"
ON projects
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
    AND project_members.role = 'owner'
  )
);