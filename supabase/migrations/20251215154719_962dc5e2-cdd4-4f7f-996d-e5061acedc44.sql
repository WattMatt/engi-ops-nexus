-- Lighting Fittings (Master Library)
CREATE TABLE public.lighting_fittings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  fitting_code TEXT NOT NULL,
  manufacturer TEXT,
  model_name TEXT NOT NULL,
  fitting_type TEXT NOT NULL,
  wattage NUMERIC,
  lumen_output NUMERIC,
  color_temperature INTEGER,
  cri INTEGER,
  beam_angle INTEGER,
  ip_rating TEXT,
  ik_rating TEXT,
  lifespan_hours INTEGER,
  dimensions TEXT,
  weight NUMERIC,
  supply_cost NUMERIC DEFAULT 0,
  install_cost NUMERIC DEFAULT 0,
  category TEXT,
  subcategory TEXT,
  is_dimmable BOOLEAN DEFAULT false,
  driver_type TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lighting Spec Sheets
CREATE TABLE public.lighting_spec_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fitting_id UUID REFERENCES public.lighting_fittings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  parsed_data JSONB,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Lighting Schedules
CREATE TABLE public.project_lighting_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  zone_name TEXT,
  fitting_id UUID REFERENCES public.lighting_fittings(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  total_wattage NUMERIC,
  total_lumens NUMERIC,
  notes TEXT,
  approval_status TEXT DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lighting Comparisons
CREATE TABLE public.lighting_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  comparison_name TEXT NOT NULL,
  fitting_ids UUID[] NOT NULL,
  comparison_criteria JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lighting_fittings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_spec_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_lighting_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lighting_fittings
-- Global fittings (project_id IS NULL) visible to all authenticated users
-- Project-specific fittings visible to project members
CREATE POLICY "Users can view global and project fittings" 
ON public.lighting_fittings 
FOR SELECT 
USING (
  project_id IS NULL 
  OR user_has_project_access(project_id)
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can insert fittings" 
ON public.lighting_fittings 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (project_id IS NULL OR user_has_project_access(project_id))
);

CREATE POLICY "Users can update their fittings" 
ON public.lighting_fittings 
FOR UPDATE 
USING (
  project_id IS NULL 
  OR user_has_project_access(project_id)
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can delete their fittings" 
ON public.lighting_fittings 
FOR DELETE 
USING (
  project_id IS NULL 
  OR user_has_project_access(project_id)
  OR has_role(auth.uid(), 'admin')
);

-- RLS Policies for lighting_spec_sheets
CREATE POLICY "Users can view spec sheets" 
ON public.lighting_spec_sheets 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage spec sheets" 
ON public.lighting_spec_sheets 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for project_lighting_schedules
CREATE POLICY "Users can view project schedules" 
ON public.project_lighting_schedules 
FOR SELECT 
USING (user_has_project_access(project_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage project schedules" 
ON public.project_lighting_schedules 
FOR ALL 
USING (user_has_project_access(project_id) OR has_role(auth.uid(), 'admin'))
WITH CHECK (user_has_project_access(project_id) OR has_role(auth.uid(), 'admin'));

-- RLS Policies for lighting_comparisons
CREATE POLICY "Users can view comparisons" 
ON public.lighting_comparisons 
FOR SELECT 
USING (
  project_id IS NULL 
  OR user_has_project_access(project_id) 
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can manage comparisons" 
ON public.lighting_comparisons 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create updated_at triggers
CREATE TRIGGER update_lighting_fittings_updated_at
BEFORE UPDATE ON public.lighting_fittings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_project_lighting_schedules_updated_at
BEFORE UPDATE ON public.project_lighting_schedules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();