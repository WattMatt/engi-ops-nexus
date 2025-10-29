-- Add RLS policies for user_roles table

-- Allow admins to insert roles for any user
CREATE POLICY "Admins can insert user roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
);

-- Allow admins to update user roles
CREATE POLICY "Admins can update user roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to delete user roles
CREATE POLICY "Admins can delete user roles"
ON user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow users to view their own role
CREATE POLICY "Users can view their own role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));