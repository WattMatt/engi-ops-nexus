-- Floor Plan Lighting Placements
CREATE TABLE public.floor_plan_lighting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  fitting_id UUID NOT NULL REFERENCES public.lighting_fittings(id) ON DELETE CASCADE,
  x_position NUMERIC NOT NULL,
  y_position NUMERIC NOT NULL,
  rotation NUMERIC DEFAULT 0,
  zone_id UUID,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  mounting_height NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- IES Photometric Data
CREATE TABLE public.lighting_photometric_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fitting_id UUID NOT NULL REFERENCES public.lighting_fittings(id) ON DELETE CASCADE,
  ies_file_path TEXT,
  candela_data JSONB,
  utilization_data JSONB,
  lumens NUMERIC,
  lamp_type TEXT,
  mounting_type TEXT,
  parsed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.lighting_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  categories TEXT[],
  is_preferred BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quote Requests
CREATE TABLE public.lighting_quote_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.lighting_suppliers(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  response_received_at TIMESTAMP WITH TIME ZONE,
  quoted_total NUMERIC,
  notes TEXT,
  reference_number TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.floor_plan_lighting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_photometric_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_quote_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for floor_plan_lighting
CREATE POLICY "Users can view floor plan lighting for accessible floor plans"
ON public.floor_plan_lighting FOR SELECT
USING (public.user_has_floor_plan_access(floor_plan_id));

CREATE POLICY "Users can insert floor plan lighting for accessible floor plans"
ON public.floor_plan_lighting FOR INSERT
WITH CHECK (public.user_has_floor_plan_access(floor_plan_id));

CREATE POLICY "Users can update floor plan lighting for accessible floor plans"
ON public.floor_plan_lighting FOR UPDATE
USING (public.user_has_floor_plan_access(floor_plan_id));

CREATE POLICY "Users can delete floor plan lighting for accessible floor plans"
ON public.floor_plan_lighting FOR DELETE
USING (public.user_has_floor_plan_access(floor_plan_id));

-- RLS Policies for lighting_photometric_data
CREATE POLICY "Authenticated users can view photometric data"
ON public.lighting_photometric_data FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert photometric data"
ON public.lighting_photometric_data FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update photometric data"
ON public.lighting_photometric_data FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete photometric data"
ON public.lighting_photometric_data FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for lighting_suppliers
CREATE POLICY "Authenticated users can view suppliers"
ON public.lighting_suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert suppliers"
ON public.lighting_suppliers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
ON public.lighting_suppliers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete suppliers"
ON public.lighting_suppliers FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for lighting_quote_requests
CREATE POLICY "Users can view quote requests for their projects"
ON public.lighting_quote_requests FOR SELECT
TO authenticated
USING (project_id IS NULL OR public.user_has_project_access(project_id));

CREATE POLICY "Users can insert quote requests"
ON public.lighting_quote_requests FOR INSERT
TO authenticated
WITH CHECK (project_id IS NULL OR public.user_has_project_access(project_id));

CREATE POLICY "Users can update quote requests for their projects"
ON public.lighting_quote_requests FOR UPDATE
TO authenticated
USING (project_id IS NULL OR public.user_has_project_access(project_id));

CREATE POLICY "Users can delete quote requests for their projects"
ON public.lighting_quote_requests FOR DELETE
TO authenticated
USING (project_id IS NULL OR public.user_has_project_access(project_id));

-- Create indexes
CREATE INDEX idx_floor_plan_lighting_floor_plan ON public.floor_plan_lighting(floor_plan_id);
CREATE INDEX idx_floor_plan_lighting_fitting ON public.floor_plan_lighting(fitting_id);
CREATE INDEX idx_lighting_photometric_fitting ON public.lighting_photometric_data(fitting_id);
CREATE INDEX idx_lighting_quote_requests_project ON public.lighting_quote_requests(project_id);
CREATE INDEX idx_lighting_quote_requests_supplier ON public.lighting_quote_requests(supplier_id);