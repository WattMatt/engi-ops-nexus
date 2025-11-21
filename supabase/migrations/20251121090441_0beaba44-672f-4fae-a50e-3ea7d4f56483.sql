-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own floor plan designs" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Users can insert their own floor plan designs" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Users can update their own floor plan designs" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Users can delete their own floor plan designs" ON public.floor_plan_projects;
DROP POLICY IF EXISTS "Users can manage equipment for their floor plans" ON public.floor_plan_equipment;
DROP POLICY IF EXISTS "Users can manage zones for their floor plans" ON public.floor_plan_zones;
DROP POLICY IF EXISTS "Users can manage containment for their floor plans" ON public.floor_plan_containment;
DROP POLICY IF EXISTS "Users can manage PV config for their floor plans" ON public.floor_plan_pv_config;
DROP POLICY IF EXISTS "Users can manage PV roofs for their floor plans" ON public.floor_plan_pv_roofs;
DROP POLICY IF EXISTS "Users can manage PV arrays for their floor plans" ON public.floor_plan_pv_arrays;
DROP POLICY IF EXISTS "Users can manage tasks for their floor plans" ON public.floor_plan_tasks;
DROP POLICY IF EXISTS "Users can manage cables for their floor plans" ON public.floor_plan_cables;
DROP POLICY IF EXISTS "Users can manage their own floor plan reports" ON public.floor_plan_reports;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1
    AND user_roles.role = 'admin'
  );
$$;

-- Create security definer function to check project access
CREATE OR REPLACE FUNCTION public.has_project_access(user_id uuid, project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.user_id = $1
    AND project_members.project_id = $2
  );
$$;

-- floor_plan_projects: Admins see all, users see own + project member designs
CREATE POLICY "Admins and project members can view floor plans"
ON public.floor_plan_projects
FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  auth.uid() = user_id OR
  (project_id IS NOT NULL AND public.has_project_access(auth.uid(), project_id))
);

CREATE POLICY "Admins and owners can insert floor plans"
ON public.floor_plan_projects
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) OR
  auth.uid() = user_id
);

CREATE POLICY "Admins and owners can update floor plans"
ON public.floor_plan_projects
FOR UPDATE
USING (
  public.is_admin(auth.uid()) OR
  auth.uid() = user_id OR
  (project_id IS NOT NULL AND public.has_project_access(auth.uid(), project_id))
);

CREATE POLICY "Admins and owners can delete floor plans"
ON public.floor_plan_projects
FOR DELETE
USING (
  public.is_admin(auth.uid()) OR
  auth.uid() = user_id
);

-- floor_plan_equipment
CREATE POLICY "Admins and project members can manage equipment"
ON public.floor_plan_equipment
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects fp
    WHERE fp.id = floor_plan_equipment.floor_plan_id
    AND (
      fp.user_id = auth.uid() OR
      (fp.project_id IS NOT NULL AND public.has_project_access(auth.uid(), fp.project_id))
    )
  )
);

-- floor_plan_zones
CREATE POLICY "Admins and project members can manage zones"
ON public.floor_plan_zones
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects fp
    WHERE fp.id = floor_plan_zones.floor_plan_id
    AND (
      fp.user_id = auth.uid() OR
      (fp.project_id IS NOT NULL AND public.has_project_access(auth.uid(), fp.project_id))
    )
  )
);

-- floor_plan_containment
CREATE POLICY "Admins and project members can manage containment"
ON public.floor_plan_containment
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects fp
    WHERE fp.id = floor_plan_containment.floor_plan_id
    AND (
      fp.user_id = auth.uid() OR
      (fp.project_id IS NOT NULL AND public.has_project_access(auth.uid(), fp.project_id))
    )
  )
);

-- floor_plan_pv_config
CREATE POLICY "Admins and project members can manage PV config"
ON public.floor_plan_pv_config
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects fp
    WHERE fp.id = floor_plan_pv_config.floor_plan_id
    AND (
      fp.user_id = auth.uid() OR
      (fp.project_id IS NOT NULL AND public.has_project_access(auth.uid(), fp.project_id))
    )
  )
);

-- floor_plan_pv_roofs
CREATE POLICY "Admins and project members can manage PV roofs"
ON public.floor_plan_pv_roofs
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects fp
    WHERE fp.id = floor_plan_pv_roofs.floor_plan_id
    AND (
      fp.user_id = auth.uid() OR
      (fp.project_id IS NOT NULL AND public.has_project_access(auth.uid(), fp.project_id))
    )
  )
);

-- floor_plan_pv_arrays
CREATE POLICY "Admins and project members can manage PV arrays"
ON public.floor_plan_pv_arrays
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_pv_roofs roof
    JOIN public.floor_plan_projects fp ON fp.id = roof.floor_plan_id
    WHERE roof.id = floor_plan_pv_arrays.roof_id
    AND (
      fp.user_id = auth.uid() OR
      (fp.project_id IS NOT NULL AND public.has_project_access(auth.uid(), fp.project_id))
    )
  )
);

-- floor_plan_tasks
CREATE POLICY "Admins and project members can manage tasks"
ON public.floor_plan_tasks
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects fp
    WHERE fp.id = floor_plan_tasks.floor_plan_id
    AND (
      fp.user_id = auth.uid() OR
      (fp.project_id IS NOT NULL AND public.has_project_access(auth.uid(), fp.project_id))
    )
  )
);

-- floor_plan_cables
CREATE POLICY "Admins and project members can manage cables"
ON public.floor_plan_cables
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects fp
    WHERE fp.id = floor_plan_cables.floor_plan_id
    AND (
      fp.user_id = auth.uid() OR
      (fp.project_id IS NOT NULL AND public.has_project_access(auth.uid(), fp.project_id))
    )
  )
);

-- floor_plan_reports
CREATE POLICY "Admins and owners can manage reports"
ON public.floor_plan_reports
FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  auth.uid() = user_id
);