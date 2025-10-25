-- Drop existing problematic RLS policies on employees table
DROP POLICY IF EXISTS "Admins can manage all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can update their own record" ON public.employees;
DROP POLICY IF EXISTS "Employees can view all employees" ON public.employees;

-- Create non-recursive RLS policies using has_role function
-- Admins can do everything
CREATE POLICY "Admins can manage all employees"
  ON public.employees FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Regular employees can view all employee records
CREATE POLICY "Employees can view all employees"
  ON public.employees FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = auth.uid()
    )
  );

-- Employees can update only their own record
CREATE POLICY "Employees can update own record"
  ON public.employees FOR UPDATE
  USING (user_id = auth.uid());