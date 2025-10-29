-- Fix circular dependency in user_roles RLS policies
-- The key is to NOT use has_role() function in policies on user_roles table itself

-- Drop all existing SELECT policies on user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- Simple policy: users can always view their own role
-- Admins can view any role (without using has_role function to avoid recursion)
CREATE POLICY "Anyone can view roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  -- Users can see their own role
  user_id = auth.uid()
  OR
  -- Or if the current user has admin/moderator role (direct check, no function)
  EXISTS (
    SELECT 1 FROM user_roles admin_check
    WHERE admin_check.user_id = auth.uid()
    AND admin_check.role IN ('admin', 'moderator')
  )
);