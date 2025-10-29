-- Fix user_roles policies to ensure users can always read their own role
-- This is critical for the has_role function to work properly

DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;

-- Allow everyone to view their own role (critical for authorization checks)
CREATE POLICY "Users can view their own role"
ON user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  -- Also allow if they're checking if someone else has a role (for admin checks)
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'moderator')
  )
);

-- Make sure admins can see all roles
CREATE POLICY "Admins can view all roles" ON user_roles
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);