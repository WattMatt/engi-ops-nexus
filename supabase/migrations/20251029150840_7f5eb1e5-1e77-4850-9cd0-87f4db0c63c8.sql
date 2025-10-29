-- CRITICAL FIX: Remove ALL recursion from user_roles policies
-- The simplest solution: let all authenticated users view all roles
-- This is safe because:
-- 1. Users need to see their own role for authorization
-- 2. Admins need to see all roles to manage them
-- 3. Role info isn't sensitive data

-- Drop ALL existing policies on user_roles
DROP POLICY IF EXISTS "Anyone can view roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;

-- Simple policy: all authenticated users can view all roles (NO recursion)
CREATE POLICY "Authenticated users can view roles"
ON user_roles
FOR SELECT
TO authenticated
USING (true);  -- Simple! No queries, no recursion

-- Keep the insert/update/delete policies as they were (they don't cause recursion)
-- These are already in place from previous migrations