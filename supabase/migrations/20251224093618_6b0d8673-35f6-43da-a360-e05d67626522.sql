-- Phase 1: Floor Plan Material Mappings (Equipment ↔ BOQ Items)
CREATE TABLE public.floor_plan_material_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_plan_id UUID REFERENCES public.floor_plan_projects(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  equipment_label TEXT,
  boq_item_id UUID REFERENCES public.boq_extracted_items(id) ON DELETE SET NULL,
  master_material_id UUID REFERENCES public.master_materials(id) ON DELETE SET NULL,
  final_account_item_id UUID REFERENCES public.final_account_items(id) ON DELETE SET NULL,
  quantity_per_unit NUMERIC DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, equipment_type, equipment_label)
);

-- Phase 2: Circuit Materials (Cable Entry ↔ Materials)
CREATE TABLE public.circuit_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cable_entry_id UUID NOT NULL REFERENCES public.cable_entries(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL, -- 'cable', 'termination', 'breaker', 'accessory', 'other'
  master_material_id UUID REFERENCES public.master_materials(id) ON DELETE SET NULL,
  boq_item_id UUID REFERENCES public.boq_extracted_items(id) ON DELETE SET NULL,
  final_account_item_id UUID REFERENCES public.final_account_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'Nr',
  supply_rate NUMERIC DEFAULT 0,
  install_rate NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * (supply_rate + install_rate)) STORED,
  is_auto_calculated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Circuit Material Templates for common circuit types
CREATE TABLE public.circuit_material_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  circuit_type TEXT NOT NULL, -- 'single_phase_socket', 'three_phase_motor', 'lighting', etc.
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- NULL for global templates
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.circuit_material_template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.circuit_material_templates(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL,
  master_material_id UUID REFERENCES public.master_materials(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity_formula TEXT NOT NULL, -- e.g., 'cable_length', 'cable_length * 1.1', '2', 'cable_length / 100'
  unit TEXT DEFAULT 'Nr',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.floor_plan_material_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_material_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_material_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for floor_plan_material_mappings
CREATE POLICY "Users can view mappings for their projects"
  ON public.floor_plan_material_mappings FOR SELECT
  USING (
    public.user_has_project_access(project_id) OR
    public.user_has_floor_plan_access(floor_plan_id)
  );

CREATE POLICY "Users can create mappings for their projects"
  ON public.floor_plan_material_mappings FOR INSERT
  WITH CHECK (
    public.user_has_project_access(project_id) OR
    public.user_has_floor_plan_access(floor_plan_id)
  );

CREATE POLICY "Users can update mappings for their projects"
  ON public.floor_plan_material_mappings FOR UPDATE
  USING (
    public.user_has_project_access(project_id) OR
    public.user_has_floor_plan_access(floor_plan_id)
  );

CREATE POLICY "Users can delete mappings for their projects"
  ON public.floor_plan_material_mappings FOR DELETE
  USING (
    public.user_has_project_access(project_id) OR
    public.user_has_floor_plan_access(floor_plan_id)
  );

-- RLS Policies for circuit_materials (via cable_entries → cable_schedules → project)
CREATE POLICY "Users can view circuit materials"
  ON public.circuit_materials FOR SELECT
  USING (true); -- Will be filtered by cable_entry access

CREATE POLICY "Users can manage circuit materials"
  ON public.circuit_materials FOR ALL
  USING (true);

-- RLS Policies for circuit_material_templates
CREATE POLICY "Users can view templates"
  ON public.circuit_material_templates FOR SELECT
  USING (
    project_id IS NULL OR public.user_has_project_access(project_id)
  );

CREATE POLICY "Users can manage project templates"
  ON public.circuit_material_templates FOR ALL
  USING (
    project_id IS NULL OR public.user_has_project_access(project_id)
  );

-- RLS Policies for template items
CREATE POLICY "Users can view template items"
  ON public.circuit_material_template_items FOR SELECT
  USING (true);

CREATE POLICY "Users can manage template items"
  ON public.circuit_material_template_items FOR ALL
  USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_floor_plan_material_mappings_updated_at
  BEFORE UPDATE ON public.floor_plan_material_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_circuit_materials_updated_at
  BEFORE UPDATE ON public.circuit_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_circuit_material_templates_updated_at
  BEFORE UPDATE ON public.circuit_material_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default circuit material templates
INSERT INTO public.circuit_material_templates (name, circuit_type, is_default) VALUES
  ('Single Phase Socket Circuit', 'single_phase_socket', true),
  ('Three Phase Motor Circuit', 'three_phase_motor', true),
  ('Lighting Circuit', 'lighting', true),
  ('DB Submain', 'submain', true);

-- Default template items for Single Phase Socket
INSERT INTO public.circuit_material_template_items (template_id, material_type, description, quantity_formula, unit, display_order)
SELECT id, 'cable', 'Cable (per measured length)', 'cable_length', 'm', 1 FROM public.circuit_material_templates WHERE circuit_type = 'single_phase_socket';

INSERT INTO public.circuit_material_template_items (template_id, material_type, description, quantity_formula, unit, display_order)
SELECT id, 'termination', 'Cable Terminations', '2', 'Nr', 2 FROM public.circuit_material_templates WHERE circuit_type = 'single_phase_socket';

INSERT INTO public.circuit_material_template_items (template_id, material_type, description, quantity_formula, unit, display_order)
SELECT id, 'breaker', 'Circuit Breaker', '1', 'Nr', 3 FROM public.circuit_material_templates WHERE circuit_type = 'single_phase_socket';