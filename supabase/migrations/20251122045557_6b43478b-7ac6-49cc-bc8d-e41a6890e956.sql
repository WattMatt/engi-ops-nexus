-- Drop the overly permissive policy on payroll_records
DROP POLICY IF EXISTS "auth_full_access" ON public.payroll_records;

-- Allow admins to view all payroll records
CREATE POLICY "Admins can view all payroll records"
ON public.payroll_records
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow employees to view only their own payroll records
CREATE POLICY "Employees can view their own payroll records"
ON public.payroll_records
FOR SELECT
TO authenticated
USING (employee_id IN (
  SELECT id FROM public.employees WHERE user_id = auth.uid()
));

-- Allow admins to insert payroll records
CREATE POLICY "Admins can insert payroll records"
ON public.payroll_records
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update payroll records
CREATE POLICY "Admins can update payroll records"
ON public.payroll_records
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete payroll records
CREATE POLICY "Admins can delete payroll records"
ON public.payroll_records
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));