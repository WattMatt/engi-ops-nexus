-- Create project_boqs table (main BOQ record per project)
CREATE TABLE public.project_boqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  boq_number TEXT NOT NULL,
  boq_name TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id)
);

-- Create boq_bills table (bills within a BOQ)
CREATE TABLE public.boq_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_boq_id UUID NOT NULL REFERENCES public.project_boqs(id) ON DELETE CASCADE,
  bill_number INTEGER NOT NULL,
  bill_name TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_boq_id, bill_number)
);

-- Create boq_project_sections table (sections within a bill)
CREATE TABLE public.boq_project_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.boq_bills(id) ON DELETE CASCADE,
  section_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bill_id, section_code)
);

-- Create boq_items table (items within a section)
CREATE TABLE public.boq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.boq_project_sections(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  supply_rate NUMERIC DEFAULT 0,
  install_rate NUMERIC DEFAULT 0,
  total_rate NUMERIC GENERATED ALWAYS AS (COALESCE(supply_rate, 0) + COALESCE(install_rate, 0)) STORED,
  supply_cost NUMERIC GENERATED ALWAYS AS (COALESCE(quantity, 0) * COALESCE(supply_rate, 0)) STORED,
  install_cost NUMERIC GENERATED ALWAYS AS (COALESCE(quantity, 0) * COALESCE(install_rate, 0)) STORED,
  total_amount NUMERIC GENERATED ALWAYS AS (COALESCE(quantity, 0) * (COALESCE(supply_rate, 0) + COALESCE(install_rate, 0))) STORED,
  master_material_id UUID REFERENCES public.master_materials(id),
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.project_boqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_boqs
CREATE POLICY "Users can view BOQs for their projects" 
ON public.project_boqs FOR SELECT 
USING (public.user_has_project_access(project_id));

CREATE POLICY "Users can create BOQs for their projects" 
ON public.project_boqs FOR INSERT 
WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "Users can update BOQs for their projects" 
ON public.project_boqs FOR UPDATE 
USING (public.user_has_project_access(project_id));

CREATE POLICY "Users can delete BOQs for their projects" 
ON public.project_boqs FOR DELETE 
USING (public.user_has_project_access(project_id));

-- RLS Policies for boq_bills (access via project_boqs)
CREATE POLICY "Users can view bills for their BOQs" 
ON public.boq_bills FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.project_boqs pboq 
  WHERE pboq.id = project_boq_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can create bills for their BOQs" 
ON public.boq_bills FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_boqs pboq 
  WHERE pboq.id = project_boq_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can update bills for their BOQs" 
ON public.boq_bills FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.project_boqs pboq 
  WHERE pboq.id = project_boq_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can delete bills for their BOQs" 
ON public.boq_bills FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.project_boqs pboq 
  WHERE pboq.id = project_boq_id 
  AND public.user_has_project_access(pboq.project_id)
));

-- RLS Policies for boq_project_sections (access via boq_bills)
CREATE POLICY "Users can view sections for their bills" 
ON public.boq_project_sections FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.boq_bills bb
  JOIN public.project_boqs pboq ON pboq.id = bb.project_boq_id
  WHERE bb.id = bill_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can create sections for their bills" 
ON public.boq_project_sections FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.boq_bills bb
  JOIN public.project_boqs pboq ON pboq.id = bb.project_boq_id
  WHERE bb.id = bill_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can update sections for their bills" 
ON public.boq_project_sections FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.boq_bills bb
  JOIN public.project_boqs pboq ON pboq.id = bb.project_boq_id
  WHERE bb.id = bill_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can delete sections for their bills" 
ON public.boq_project_sections FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.boq_bills bb
  JOIN public.project_boqs pboq ON pboq.id = bb.project_boq_id
  WHERE bb.id = bill_id 
  AND public.user_has_project_access(pboq.project_id)
));

-- RLS Policies for boq_items (access via boq_project_sections)
CREATE POLICY "Users can view items for their sections" 
ON public.boq_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.boq_project_sections bps
  JOIN public.boq_bills bb ON bb.id = bps.bill_id
  JOIN public.project_boqs pboq ON pboq.id = bb.project_boq_id
  WHERE bps.id = section_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can create items for their sections" 
ON public.boq_items FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.boq_project_sections bps
  JOIN public.boq_bills bb ON bb.id = bps.bill_id
  JOIN public.project_boqs pboq ON pboq.id = bb.project_boq_id
  WHERE bps.id = section_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can update items for their sections" 
ON public.boq_items FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.boq_project_sections bps
  JOIN public.boq_bills bb ON bb.id = bps.bill_id
  JOIN public.project_boqs pboq ON pboq.id = bb.project_boq_id
  WHERE bps.id = section_id 
  AND public.user_has_project_access(pboq.project_id)
));

CREATE POLICY "Users can delete items for their sections" 
ON public.boq_items FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.boq_project_sections bps
  JOIN public.boq_bills bb ON bb.id = bps.bill_id
  JOIN public.project_boqs pboq ON pboq.id = bb.project_boq_id
  WHERE bps.id = section_id 
  AND public.user_has_project_access(pboq.project_id)
));

-- Create updated_at triggers
CREATE TRIGGER update_project_boqs_updated_at
BEFORE UPDATE ON public.project_boqs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boq_bills_updated_at
BEFORE UPDATE ON public.boq_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boq_project_sections_updated_at
BEFORE UPDATE ON public.boq_project_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boq_items_updated_at
BEFORE UPDATE ON public.boq_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update parent totals when items change
CREATE OR REPLACE FUNCTION public.update_boq_section_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update section total
  UPDATE public.boq_project_sections
  SET total_amount = (
    SELECT COALESCE(SUM(total_amount), 0) 
    FROM public.boq_items 
    WHERE section_id = COALESCE(NEW.section_id, OLD.section_id)
  )
  WHERE id = COALESCE(NEW.section_id, OLD.section_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update bill totals when sections change
CREATE OR REPLACE FUNCTION public.update_boq_bill_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update bill total
  UPDATE public.boq_bills
  SET total_amount = (
    SELECT COALESCE(SUM(total_amount), 0) 
    FROM public.boq_project_sections 
    WHERE bill_id = COALESCE(NEW.bill_id, OLD.bill_id)
  )
  WHERE id = COALESCE(NEW.bill_id, OLD.bill_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update BOQ totals when bills change
CREATE OR REPLACE FUNCTION public.update_project_boq_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update BOQ total
  UPDATE public.project_boqs
  SET total_amount = (
    SELECT COALESCE(SUM(total_amount), 0) 
    FROM public.boq_bills 
    WHERE project_boq_id = COALESCE(NEW.project_boq_id, OLD.project_boq_id)
  )
  WHERE id = COALESCE(NEW.project_boq_id, OLD.project_boq_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for cascading totals
CREATE TRIGGER update_section_totals_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.boq_items
FOR EACH ROW
EXECUTE FUNCTION public.update_boq_section_totals();

CREATE TRIGGER update_bill_totals_on_section_change
AFTER INSERT OR UPDATE OR DELETE ON public.boq_project_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_boq_bill_totals();

CREATE TRIGGER update_boq_totals_on_bill_change
AFTER INSERT OR UPDATE OR DELETE ON public.boq_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_project_boq_totals();