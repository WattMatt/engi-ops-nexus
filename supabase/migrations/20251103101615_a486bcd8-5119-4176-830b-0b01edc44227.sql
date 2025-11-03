-- Drop the recursive policies
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Users can add members to their projects" ON project_members;
DROP POLICY IF EXISTS "Users can update members in their projects" ON project_members;
DROP POLICY IF EXISTS "Users can remove members from their projects" ON project_members;

-- Create security definer function to check project membership
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE user_id = _user_id
    AND project_id = _project_id
  )
$$;

-- Create non-recursive RLS policies using the function
CREATE POLICY "Users can view members of their projects"
ON project_members
FOR SELECT
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can add members to their projects"
ON project_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can update members in their projects"
ON project_members
FOR UPDATE
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can remove members from their projects"
ON project_members
FOR DELETE
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));