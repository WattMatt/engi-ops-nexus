-- Create tenant_evaluations table to store evaluation forms
CREATE TABLE public.tenant_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  evaluated_by TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  
  -- Tenant Design Pack section
  tdp_db_position_indicated TEXT CHECK (tdp_db_position_indicated IN ('yes', 'no', 'na')),
  tdp_db_distance_from_water TEXT CHECK (tdp_db_distance_from_water IN ('yes', 'no', 'na')),
  tdp_floor_points_indicated TEXT CHECK (tdp_floor_points_indicated IN ('yes', 'no', 'na')),
  tdp_floor_points_dimensioned TEXT CHECK (tdp_floor_points_dimensioned IN ('yes', 'no', 'na')),
  tdp_electrical_power_indicated TEXT CHECK (tdp_electrical_power_indicated IN ('yes', 'no', 'na')),
  tdp_electrical_points_legend TEXT CHECK (tdp_electrical_points_legend IN ('yes', 'no', 'na')),
  tdp_electrical_points_dimensioned TEXT CHECK (tdp_electrical_points_dimensioned IN ('yes', 'no', 'na')),
  tdp_lighting_indicated TEXT CHECK (tdp_lighting_indicated IN ('yes', 'no', 'na')),
  tdp_ceiling_height_indicated TEXT CHECK (tdp_ceiling_height_indicated IN ('yes', 'no', 'na')),
  tdp_fittings_in_schedule TEXT CHECK (tdp_fittings_in_schedule IN ('yes', 'no', 'na')),
  tdp_light_switch_position TEXT CHECK (tdp_light_switch_position IN ('yes', 'no', 'na')),
  tdp_signage_outlet TEXT CHECK (tdp_signage_outlet IN ('yes', 'no', 'na')),
  tdp_mechanical_ventilation TEXT CHECK (tdp_mechanical_ventilation IN ('yes', 'no', 'na')),
  
  -- Scope of Work and Final Site Layouts section
  sow_db_size_visible TEXT CHECK (sow_db_size_visible IN ('yes', 'no', 'na')),
  sow_db_position_confirmed TEXT CHECK (sow_db_position_confirmed IN ('yes', 'no', 'na')),
  sow_power_points_visible TEXT CHECK (sow_power_points_visible IN ('yes', 'no', 'na')),
  sow_lighting_responsibility TEXT CHECK (sow_lighting_responsibility IN ('yes', 'no', 'na')),
  
  -- Comments
  comments TEXT,
  
  -- Status and timestamps
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'approved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.tenant_evaluations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view tenant evaluations" 
ON public.tenant_evaluations 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create tenant evaluations" 
ON public.tenant_evaluations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update tenant evaluations" 
ON public.tenant_evaluations 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete tenant evaluations" 
ON public.tenant_evaluations 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tenant_evaluations_updated_at
BEFORE UPDATE ON public.tenant_evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create saved evaluation reports table
CREATE TABLE public.tenant_evaluation_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.tenant_evaluations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  revision TEXT NOT NULL DEFAULT '1',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_evaluation_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view evaluation reports" 
ON public.tenant_evaluation_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create evaluation reports" 
ON public.tenant_evaluation_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete evaluation reports" 
ON public.tenant_evaluation_reports 
FOR DELETE 
USING (true);

-- Create indexes for faster lookups
CREATE INDEX idx_tenant_evaluations_tenant_id ON public.tenant_evaluations(tenant_id);
CREATE INDEX idx_tenant_evaluations_project_id ON public.tenant_evaluations(project_id);
CREATE INDEX idx_tenant_evaluation_reports_evaluation_id ON public.tenant_evaluation_reports(evaluation_id);
CREATE INDEX idx_tenant_evaluation_reports_tenant_id ON public.tenant_evaluation_reports(tenant_id);