-- Update RLS policies for project_members to show all members of projects user belongs to

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their project memberships" ON project_members;

-- Allow users to view all members of projects they belong to
CREATE POLICY "Users can view members of their projects"
ON project_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Allow users to add members to projects they belong to
CREATE POLICY "Users can add members to their projects"
ON project_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Allow users to update member roles in projects they belong to
CREATE POLICY "Users can update members in their projects"
ON project_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Allow users to remove members from projects they belong to
CREATE POLICY "Users can remove members from their projects"
ON project_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
  )
);