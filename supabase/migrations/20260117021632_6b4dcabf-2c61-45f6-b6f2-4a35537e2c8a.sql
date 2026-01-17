-- Create a security definer function to check project member position
CREATE OR REPLACE FUNCTION public.get_project_member_position(_user_id uuid, _project_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position
  FROM public.project_members
  WHERE user_id = _user_id
    AND project_id = _project_id
  LIMIT 1
$$;

-- Create a helper function to check if user is admin on a project
CREATE OR REPLACE FUNCTION public.is_project_admin(_user_id uuid, _project_id uuid)
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
      AND position = 'admin'
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Project admins can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Project members can view their project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.project_members;

-- Recreate policies using security definer functions
CREATE POLICY "Project admins can manage members"
ON public.project_members
FOR ALL
TO authenticated
USING (public.is_project_admin(auth.uid(), project_id))
WITH CHECK (public.is_project_admin(auth.uid(), project_id));

-- Allow users to view members of projects they belong to
CREATE POLICY "Project members can view members"
ON public.project_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
  )
);