-- First, let's assign admin role to the first user (you)
-- This assumes the first user created should be the admin
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  -- Get the first user ID from profiles
  SELECT id INTO first_user_id
  FROM profiles
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If user doesn't have a role, assign admin
  IF first_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = first_user_id
  ) THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (first_user_id, 'admin');
  END IF;
END $$;

-- Update the insert policy to allow self-assignment during signup
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;

CREATE POLICY "Admins and system can insert user roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow admins to insert any role
  has_role(auth.uid(), 'admin')
  OR
  -- Allow users to insert their own 'user' role during signup (for backward compatibility)
  (user_id = auth.uid() AND role = 'user')
);

-- Also update profiles to ensure current user has active status
UPDATE profiles
SET status = 'active'
WHERE id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL);
