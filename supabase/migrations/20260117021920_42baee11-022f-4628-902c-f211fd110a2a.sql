-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Project members can view members" ON public.project_members;

-- Create a security definer function to check if user is a member of a project
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

-- Recreate the SELECT policy using the security definer function
CREATE POLICY "Project members can view members"
ON public.project_members
FOR SELECT
TO authenticated
USING (public.is_project_member(auth.uid(), project_id));