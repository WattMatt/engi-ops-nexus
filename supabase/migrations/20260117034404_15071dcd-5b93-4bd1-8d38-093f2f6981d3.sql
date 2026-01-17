-- Bill Structure Templates - reusable bill/section structures without quantities
CREATE TABLE public.bill_structure_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'final_account', -- 'final_account', 'boq', 'budget'
  tags TEXT[] DEFAULT '{}',
  building_type TEXT, -- 'mall', 'office', 'retail', 'industrial', etc.
  is_global BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Template Bills - bills within a template
CREATE TABLE public.template_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.bill_structure_templates(id) ON DELETE CASCADE,
  bill_number INTEGER NOT NULL,
  bill_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Template Sections - sections within template bills
CREATE TABLE public.template_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_bill_id UUID NOT NULL REFERENCES public.template_bills(id) ON DELETE CASCADE,
  section_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Template Items - items within template sections (no quantities, just structure)
CREATE TABLE public.template_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_section_id UUID NOT NULL REFERENCES public.template_sections(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  item_type TEXT DEFAULT 'quantity', -- 'quantity', 'prime_cost', 'percentage', 'sub_header'
  master_material_id UUID REFERENCES public.master_materials(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bill_structure_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies - templates are viewable by all authenticated users
CREATE POLICY "Templates viewable by authenticated users"
  ON public.bill_structure_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Templates can be created by authenticated users"
  ON public.bill_structure_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Templates can be updated by creator or admin"
  ON public.bill_structure_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "Templates can be deleted by creator or admin"
  ON public.bill_structure_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- Template bills policies
CREATE POLICY "Template bills viewable by authenticated users"
  ON public.template_bills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Template bills manageable by template owner"
  ON public.template_bills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bill_structure_templates t
      WHERE t.id = template_id
      AND (t.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Template sections policies
CREATE POLICY "Template sections viewable by authenticated users"
  ON public.template_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Template sections manageable by template owner"
  ON public.template_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_bills tb
      JOIN public.bill_structure_templates t ON t.id = tb.template_id
      WHERE tb.id = template_bill_id
      AND (t.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Template items policies
CREATE POLICY "Template items viewable by authenticated users"
  ON public.template_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Template items manageable by template owner"
  ON public.template_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_sections ts
      JOIN public.template_bills tb ON tb.id = ts.template_bill_id
      JOIN public.bill_structure_templates t ON t.id = tb.template_id
      WHERE ts.id = template_section_id
      AND (t.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Indexes for performance
CREATE INDEX idx_bill_structure_templates_type ON public.bill_structure_templates(template_type);
CREATE INDEX idx_bill_structure_templates_building ON public.bill_structure_templates(building_type);
CREATE INDEX idx_template_bills_template ON public.template_bills(template_id);
CREATE INDEX idx_template_sections_bill ON public.template_sections(template_bill_id);
CREATE INDEX idx_template_items_section ON public.template_items(template_section_id);

-- Trigger for updated_at
CREATE TRIGGER update_bill_structure_templates_updated_at
  BEFORE UPDATE ON public.bill_structure_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();