-- Update RLS policies on projects table to allow all authenticated users to create projects

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create projects for their projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can create projects" ON public.projects;

-- Create new policy allowing all authenticated users to create projects
CREATE POLICY "Authenticated users can create projects" 
ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- Ensure SELECT policy allows users to see projects they're members of
DROP POLICY IF EXISTS "Users can view their projects" ON public.projects;

CREATE POLICY "Users can view their projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (
  is_project_member(auth.uid(), id) OR 
  auth.uid() = created_by OR
  has_role(auth.uid(), 'admin')
);

-- Ensure UPDATE policy allows project members to update
DROP POLICY IF EXISTS "Users can update their projects" ON public.projects;

CREATE POLICY "Project members can update projects" 
ON public.projects 
FOR UPDATE 
TO authenticated
USING (
  is_project_member(auth.uid(), id) OR 
  auth.uid() = created_by OR
  has_role(auth.uid(), 'admin')
);

-- Ensure DELETE policy is restricted appropriately
DROP POLICY IF EXISTS "Users can delete their projects" ON public.projects;

CREATE POLICY "Admins or creators can delete projects" 
ON public.projects 
FOR DELETE 
TO authenticated
USING (
  auth.uid() = created_by OR
  has_role(auth.uid(), 'admin')
);