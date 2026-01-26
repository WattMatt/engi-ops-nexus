-- Fix RLS policies for global_contacts to ensure all authenticated users have proper access
-- The current INSERT/UPDATE/DELETE policies are applied to public role with auth check
-- which may cause issues. Let's recreate them properly for authenticated role.

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert global contacts" ON public.global_contacts;
DROP POLICY IF EXISTS "Authenticated users can update global contacts" ON public.global_contacts;
DROP POLICY IF EXISTS "Authenticated users can delete global contacts" ON public.global_contacts;
DROP POLICY IF EXISTS "Authenticated users can view global contacts" ON public.global_contacts;

-- Recreate all policies properly targeting the authenticated role
CREATE POLICY "Authenticated users can view global contacts" 
ON public.global_contacts 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert global contacts" 
ON public.global_contacts 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update global contacts" 
ON public.global_contacts 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete global contacts" 
ON public.global_contacts 
FOR DELETE 
TO authenticated
USING (true);