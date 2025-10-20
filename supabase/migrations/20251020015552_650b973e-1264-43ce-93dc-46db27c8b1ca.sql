-- Create enum for design purposes
CREATE TYPE design_purpose AS ENUM (
  'budget_markup',
  'pv_design',
  'line_shop_measurements',
  'general'
);

-- Create enum for cable types
CREATE TYPE cable_type AS ENUM (
  'mv',
  'lv_ac',
  'dc',
  'tray',
  'basket',
  'trunking',
  'sleeve'
);

-- Floor plans table
CREATE TABLE public.floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  design_purpose design_purpose NOT NULL DEFAULT 'general',
  scale_meters_per_pixel DECIMAL,
  pv_panel_length DECIMAL,
  pv_panel_width DECIMAL,
  pv_panel_wattage INTEGER,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equipment placements table
CREATE TABLE public.equipment_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  name TEXT,
  x_position DECIMAL NOT NULL,
  y_position DECIMAL NOT NULL,
  rotation INTEGER DEFAULT 0,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cable routes table
CREATE TABLE public.cable_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  route_type cable_type NOT NULL,
  name TEXT,
  points JSONB NOT NULL, -- Array of {x, y} coordinates
  length_meters DECIMAL,
  supply_from TEXT,
  supply_to TEXT,
  cable_spec TEXT,
  size TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Zones table
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  zone_type TEXT NOT NULL,
  name TEXT,
  points JSONB NOT NULL, -- Array of {x, y} coordinates forming polygon
  area_sqm DECIMAL,
  color TEXT,
  roof_pitch DECIMAL,
  roof_azimuth DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PV arrays table
CREATE TABLE public.pv_arrays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  x_position DECIMAL NOT NULL,
  y_position DECIMAL NOT NULL,
  rows INTEGER NOT NULL,
  columns INTEGER NOT NULL,
  orientation TEXT NOT NULL, -- 'portrait' or 'landscape'
  rotation INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cable_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_arrays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for floor_plans
CREATE POLICY "Users can view floor plans in their projects"
ON public.floor_plans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = floor_plans.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create floor plans in their projects"
ON public.floor_plans FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = floor_plans.project_id
    AND project_members.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update floor plans in their projects"
ON public.floor_plans FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_members.project_id = floor_plans.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- RLS Policies for equipment_placements
CREATE POLICY "Users can view equipment in their floor plans"
ON public.equipment_placements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plans fp
    JOIN public.project_members pm ON pm.project_id = fp.project_id
    WHERE fp.id = equipment_placements.floor_plan_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage equipment in their floor plans"
ON public.equipment_placements FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plans fp
    JOIN public.project_members pm ON pm.project_id = fp.project_id
    WHERE fp.id = equipment_placements.floor_plan_id
    AND pm.user_id = auth.uid()
  )
);

-- RLS Policies for cable_routes
CREATE POLICY "Users can view routes in their floor plans"
ON public.cable_routes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plans fp
    JOIN public.project_members pm ON pm.project_id = fp.project_id
    WHERE fp.id = cable_routes.floor_plan_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage routes in their floor plans"
ON public.cable_routes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plans fp
    JOIN public.project_members pm ON pm.project_id = fp.project_id
    WHERE fp.id = cable_routes.floor_plan_id
    AND pm.user_id = auth.uid()
  )
);

-- RLS Policies for zones
CREATE POLICY "Users can view zones in their floor plans"
ON public.zones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plans fp
    JOIN public.project_members pm ON pm.project_id = fp.project_id
    WHERE fp.id = zones.floor_plan_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage zones in their floor plans"
ON public.zones FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plans fp
    JOIN public.project_members pm ON pm.project_id = fp.project_id
    WHERE fp.id = zones.floor_plan_id
    AND pm.user_id = auth.uid()
  )
);

-- RLS Policies for pv_arrays
CREATE POLICY "Users can view PV arrays in their floor plans"
ON public.pv_arrays FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plans fp
    JOIN public.project_members pm ON pm.project_id = fp.project_id
    WHERE fp.id = pv_arrays.floor_plan_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage PV arrays in their floor plans"
ON public.pv_arrays FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.floor_plans fp
    JOIN public.project_members pm ON pm.project_id = fp.project_id
    WHERE fp.id = pv_arrays.floor_plan_id
    AND pm.user_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_floor_plans_updated_at
BEFORE UPDATE ON public.floor_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for floor plan PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floor-plans', 'floor-plans', false);

-- Storage policies
CREATE POLICY "Users can upload floor plans to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'floor-plans' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their floor plan files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'floor-plans' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their floor plan files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'floor-plans' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);