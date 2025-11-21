-- Drop all existing complex policies
DROP POLICY IF EXISTS "Admins and project members can view floor plans" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Admins and owners can insert floor plans" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Admins and owners can update floor plans" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Admins and owners can delete floor plans" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Admins and project members can manage equipment" ON public.floor_plan_equipment;
DROP POLICY IF EXISTS "Admins and project members can manage zones" ON public.floor_plan_zones;
DROP POLICY IF EXISTS "Admins and project members can manage containment" ON public.floor_plan_containment;
DROP POLICY IF EXISTS "Admins and project members can manage PV config" ON public.floor_plan_pv_config;
DROP POLICY IF EXISTS "Admins and project members can manage PV roofs" ON public.floor_plan_pv_roofs;
DROP POLICY IF EXISTS "Admins and project members can manage PV arrays" ON public.floor_plan_pv_arrays;
DROP POLICY IF EXISTS "Admins and project members can manage tasks" ON public.floor_plan_tasks;
DROP POLICY IF EXISTS "Admins and project members can manage cables" ON public.floor_plan_cables;
DROP POLICY IF EXISTS "Admins and owners can manage reports" ON public.floor_plan_reports;

-- Create simple policies allowing all authenticated users full access

-- floor_plan_projects
CREATE POLICY "Authenticated users can access all floor plans"
ON public.floor_plan_projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_equipment
CREATE POLICY "Authenticated users can manage all equipment"
ON public.floor_plan_equipment
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_zones
CREATE POLICY "Authenticated users can manage all zones"
ON public.floor_plan_zones
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_containment
CREATE POLICY "Authenticated users can manage all containment"
ON public.floor_plan_containment
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_pv_config
CREATE POLICY "Authenticated users can manage all PV config"
ON public.floor_plan_pv_config
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_pv_roofs
CREATE POLICY "Authenticated users can manage all PV roofs"
ON public.floor_plan_pv_roofs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_pv_arrays
CREATE POLICY "Authenticated users can manage all PV arrays"
ON public.floor_plan_pv_arrays
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_tasks
CREATE POLICY "Authenticated users can manage all tasks"
ON public.floor_plan_tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_cables
CREATE POLICY "Authenticated users can manage all cables"
ON public.floor_plan_cables
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- floor_plan_reports
CREATE POLICY "Authenticated users can manage all reports"
ON public.floor_plan_reports
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);