-- Create floor plan projects table
CREATE TABLE public.floor_plan_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  design_purpose TEXT NOT NULL CHECK (design_purpose IN ('Budget mark up', 'Line shop measurements', 'PV design')),
  pdf_url TEXT,
  scale_meters_per_pixel NUMERIC,
  state_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan equipment table
CREATE TABLE public.floor_plan_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  rotation NUMERIC DEFAULT 0,
  label TEXT,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan cables table
CREATE TABLE public.floor_plan_cables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  cable_type TEXT NOT NULL CHECK (cable_type IN ('MV', 'LV/AC', 'DC')),
  points JSONB NOT NULL,
  length_meters NUMERIC,
  from_label TEXT,
  to_label TEXT,
  termination_count INTEGER,
  start_height NUMERIC,
  end_height NUMERIC,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan containment table
CREATE TABLE public.floor_plan_containment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  points JSONB NOT NULL,
  length_meters NUMERIC,
  size TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan zones table
CREATE TABLE public.floor_plan_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  points JSONB NOT NULL,
  area_sqm NUMERIC,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan PV config table
CREATE TABLE public.floor_plan_pv_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  panel_length_m NUMERIC NOT NULL,
  panel_width_m NUMERIC NOT NULL,
  panel_wattage NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan PV roofs table
CREATE TABLE public.floor_plan_pv_roofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  mask_points JSONB NOT NULL,
  pitch_degrees NUMERIC,
  azimuth_degrees NUMERIC,
  high_point JSONB,
  low_point JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan PV arrays table
CREATE TABLE public.floor_plan_pv_arrays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roof_id UUID NOT NULL REFERENCES public.floor_plan_pv_roofs(id) ON DELETE CASCADE,
  rows INTEGER NOT NULL,
  columns INTEGER NOT NULL,
  orientation TEXT NOT NULL CHECK (orientation IN ('portrait', 'landscape')),
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  rotation NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create floor plan tasks table
CREATE TABLE public.floor_plan_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  item_type TEXT,
  item_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Completed')),
  assignee TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.floor_plan_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_cables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_containment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_pv_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_pv_roofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_pv_arrays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for floor_plan_projects
CREATE POLICY "Users can view their own floor plans"
  ON public.floor_plan_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own floor plans"
  ON public.floor_plan_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own floor plans"
  ON public.floor_plan_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own floor plans"
  ON public.floor_plan_projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for floor_plan_equipment
CREATE POLICY "Users can view equipment in their floor plans"
  ON public.floor_plan_equipment FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE id = floor_plan_equipment.floor_plan_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create equipment in their floor plans"
  ON public.floor_plan_equipment FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE id = floor_plan_equipment.floor_plan_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update equipment in their floor plans"
  ON public.floor_plan_equipment FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE id = floor_plan_equipment.floor_plan_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete equipment in their floor plans"
  ON public.floor_plan_equipment FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.floor_plan_projects
    WHERE id = floor_plan_equipment.floor_plan_id
    AND user_id = auth.uid()
  ));

-- Apply similar RLS policies to other tables (cables, containment, zones, pv_config, pv_roofs, pv_arrays, tasks)
CREATE POLICY "Users can view cables in their floor plans"
  ON public.floor_plan_cables FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_cables.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can create cables in their floor plans"
  ON public.floor_plan_cables FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_cables.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can update cables in their floor plans"
  ON public.floor_plan_cables FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_cables.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete cables in their floor plans"
  ON public.floor_plan_cables FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_cables.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can view containment in their floor plans"
  ON public.floor_plan_containment FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_containment.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can create containment in their floor plans"
  ON public.floor_plan_containment FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_containment.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can update containment in their floor plans"
  ON public.floor_plan_containment FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_containment.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete containment in their floor plans"
  ON public.floor_plan_containment FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_containment.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can view zones in their floor plans"
  ON public.floor_plan_zones FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_zones.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can create zones in their floor plans"
  ON public.floor_plan_zones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_zones.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can update zones in their floor plans"
  ON public.floor_plan_zones FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_zones.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete zones in their floor plans"
  ON public.floor_plan_zones FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_zones.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can view PV config in their floor plans"
  ON public.floor_plan_pv_config FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_pv_config.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can create PV config in their floor plans"
  ON public.floor_plan_pv_config FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_pv_config.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can update PV config in their floor plans"
  ON public.floor_plan_pv_config FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_pv_config.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete PV config in their floor plans"
  ON public.floor_plan_pv_config FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_pv_config.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can view PV roofs in their floor plans"
  ON public.floor_plan_pv_roofs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_pv_roofs.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can create PV roofs in their floor plans"
  ON public.floor_plan_pv_roofs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_pv_roofs.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can update PV roofs in their floor plans"
  ON public.floor_plan_pv_roofs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_pv_roofs.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete PV roofs in their floor plans"
  ON public.floor_plan_pv_roofs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_pv_roofs.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can view PV arrays in their floor plans"
  ON public.floor_plan_pv_arrays FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.floor_plan_pv_roofs r
    JOIN public.floor_plan_projects p ON r.floor_plan_id = p.id
    WHERE r.id = floor_plan_pv_arrays.roof_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create PV arrays in their floor plans"
  ON public.floor_plan_pv_arrays FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.floor_plan_pv_roofs r
    JOIN public.floor_plan_projects p ON r.floor_plan_id = p.id
    WHERE r.id = floor_plan_pv_arrays.roof_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update PV arrays in their floor plans"
  ON public.floor_plan_pv_arrays FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.floor_plan_pv_roofs r
    JOIN public.floor_plan_projects p ON r.floor_plan_id = p.id
    WHERE r.id = floor_plan_pv_arrays.roof_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete PV arrays in their floor plans"
  ON public.floor_plan_pv_arrays FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.floor_plan_pv_roofs r
    JOIN public.floor_plan_projects p ON r.floor_plan_id = p.id
    WHERE r.id = floor_plan_pv_arrays.roof_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can view tasks in their floor plans"
  ON public.floor_plan_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_tasks.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can create tasks in their floor plans"
  ON public.floor_plan_tasks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_tasks.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can update tasks in their floor plans"
  ON public.floor_plan_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_tasks.floor_plan_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete tasks in their floor plans"
  ON public.floor_plan_tasks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.floor_plan_projects WHERE id = floor_plan_tasks.floor_plan_id AND user_id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_floor_plan_projects_updated_at
  BEFORE UPDATE ON public.floor_plan_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_floor_plan_tasks_updated_at
  BEFORE UPDATE ON public.floor_plan_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_floor_plan_projects_user_id ON public.floor_plan_projects(user_id);
CREATE INDEX idx_floor_plan_equipment_floor_plan_id ON public.floor_plan_equipment(floor_plan_id);
CREATE INDEX idx_floor_plan_cables_floor_plan_id ON public.floor_plan_cables(floor_plan_id);
CREATE INDEX idx_floor_plan_containment_floor_plan_id ON public.floor_plan_containment(floor_plan_id);
CREATE INDEX idx_floor_plan_zones_floor_plan_id ON public.floor_plan_zones(floor_plan_id);
CREATE INDEX idx_floor_plan_pv_config_floor_plan_id ON public.floor_plan_pv_config(floor_plan_id);
CREATE INDEX idx_floor_plan_pv_roofs_floor_plan_id ON public.floor_plan_pv_roofs(floor_plan_id);
CREATE INDEX idx_floor_plan_pv_arrays_roof_id ON public.floor_plan_pv_arrays(roof_id);
CREATE INDEX idx_floor_plan_tasks_floor_plan_id ON public.floor_plan_tasks(floor_plan_id);