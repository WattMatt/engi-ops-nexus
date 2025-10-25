-- Check and fix the employees RLS SELECT policy
-- The issue is likely the recursive check in the SELECT policy
DROP POLICY IF EXISTS "Employees can view all employees" ON public.employees;

-- Create simpler SELECT policy that doesn't cause recursion
CREATE POLICY "Employees can view all employees"
  ON public.employees FOR SELECT
  USING (
    -- Admins can see all
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Authenticated users can see all (since this is internal HR system)
    auth.uid() IS NOT NULL
  );