-- Enable RLS policies for floor_plan_projects table and related tables

-- floor_plan_projects: Users can manage their own floor plan designs
CREATE POLICY "Users can view their own floor plan designs"
ON public.floor_plan_projects
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own floor plan designs"
ON public.floor_plan_projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own floor plan designs"
ON public.floor_plan_projects
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own floor plan designs"
ON public.floor_plan_projects
FOR DELETE
USING (auth.uid() = user_id);

-- floor_plan_equipment
CREATE POLICY "Users can manage equipment for their floor plans"
ON public.floor_plan_equipment
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE floor_plan_projects.id = floor_plan_equipment.floor_plan_id
    AND floor_plan_projects.user_id = auth.uid()
  )
);

-- floor_plan_zones
CREATE POLICY "Users can manage zones for their floor plans"
ON public.floor_plan_zones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE floor_plan_projects.id = floor_plan_zones.floor_plan_id
    AND floor_plan_projects.user_id = auth.uid()
  )
);

-- floor_plan_containment
CREATE POLICY "Users can manage containment for their floor plans"
ON public.floor_plan_containment
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE floor_plan_projects.id = floor_plan_containment.floor_plan_id
    AND floor_plan_projects.user_id = auth.uid()
  )
);

-- floor_plan_pv_config
CREATE POLICY "Users can manage PV config for their floor plans"
ON public.floor_plan_pv_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE floor_plan_projects.id = floor_plan_pv_config.floor_plan_id
    AND floor_plan_projects.user_id = auth.uid()
  )
);

-- floor_plan_pv_roofs
CREATE POLICY "Users can manage PV roofs for their floor plans"
ON public.floor_plan_pv_roofs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE floor_plan_projects.id = floor_plan_pv_roofs.floor_plan_id
    AND floor_plan_projects.user_id = auth.uid()
  )
);

-- floor_plan_pv_arrays (references roof_id, not floor_plan_id)
CREATE POLICY "Users can manage PV arrays for their floor plans"
ON public.floor_plan_pv_arrays
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_pv_roofs
    JOIN public.floor_plan_projects ON floor_plan_projects.id = floor_plan_pv_roofs.floor_plan_id
    WHERE floor_plan_pv_roofs.id = floor_plan_pv_arrays.roof_id
    AND floor_plan_projects.user_id = auth.uid()
  )
);

-- floor_plan_tasks
CREATE POLICY "Users can manage tasks for their floor plans"
ON public.floor_plan_tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE floor_plan_projects.id = floor_plan_tasks.floor_plan_id
    AND floor_plan_projects.user_id = auth.uid()
  )
);

-- floor_plan_cables
CREATE POLICY "Users can manage cables for their floor plans"
ON public.floor_plan_cables
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE floor_plan_projects.id = floor_plan_cables.floor_plan_id
    AND floor_plan_projects.user_id = auth.uid()
  )
);

-- floor_plan_reports (has user_id directly)
CREATE POLICY "Users can manage their own floor plan reports"
ON public.floor_plan_reports
FOR ALL
USING (auth.uid() = user_id);