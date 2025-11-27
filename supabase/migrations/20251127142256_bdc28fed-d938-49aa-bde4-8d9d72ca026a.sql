-- Security fixes for critical RLS vulnerabilities identified in security scan

-- 1. Fix employees table - restrict to HR/admin and self
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Anyone can view employees" ON public.employees;

CREATE POLICY "Users can view their own employee record" 
ON public.employees 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all employees" 
ON public.employees 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix profiles table - users can only see their own profile, admins see all
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Fix invoice_settings table - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view invoice settings" ON public.invoice_settings;
DROP POLICY IF EXISTS "Public can view invoice settings" ON public.invoice_settings;

CREATE POLICY "Authenticated users can view invoice settings" 
ON public.invoice_settings 
FOR SELECT 
TO authenticated
USING (true);

-- 4. Fix global_contacts table - restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view global contacts" ON public.global_contacts;
DROP POLICY IF EXISTS "Public can view global contacts" ON public.global_contacts;

CREATE POLICY "Authenticated users can view global contacts" 
ON public.global_contacts 
FOR SELECT 
TO authenticated
USING (true);

-- 5. Fix tenant_tracker_reports - restrict to project members
DROP POLICY IF EXISTS "Anyone can view tenant tracker reports" ON public.tenant_tracker_reports;
DROP POLICY IF EXISTS "Public can view tenant tracker reports" ON public.tenant_tracker_reports;

CREATE POLICY "Project members can view tenant tracker reports" 
ON public.tenant_tracker_reports 
FOR SELECT 
USING (public.user_has_project_access(project_id));

-- 6. Fix tenant_floor_plan_zones - restrict to project members (uses project_id column)
DROP POLICY IF EXISTS "Anyone can view tenant floor plan zones" ON public.tenant_floor_plan_zones;
DROP POLICY IF EXISTS "Public can view tenant floor plan zones" ON public.tenant_floor_plan_zones;

CREATE POLICY "Project members can view tenant floor plan zones" 
ON public.tenant_floor_plan_zones 
FOR SELECT 
USING (public.user_has_project_access(project_id));

-- 7. Ensure payroll_records has proper RLS (verify existing policies)
-- Only employees can see their own records, admins can see all
DROP POLICY IF EXISTS "Anyone can view payroll records" ON public.payroll_records;

CREATE POLICY "Employees can view own payroll" 
ON public.payroll_records 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE employees.id = payroll_records.employee_id 
    AND employees.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);