-- Create project BOQ structure (similar to final accounts)
-- This allows creating BOQ structures per project with Bills -> Sections -> Items hierarchy

-- Create project_boqs table (one per project, similar to final_accounts)
CREATE TABLE IF NOT EXISTS public.project_boqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  boq_number TEXT NOT NULL,
  boq_name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, boq_number)
);

-- Create boq_bills table (Bill No. 1, Bill No. 2, etc.)
CREATE TABLE IF NOT EXISTS public.boq_bills (
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

-- Create boq_project_sections table (Section A, B, C, etc. - project-specific sections)
-- Note: This is different from the reference boq_sections table which contains standard section definitions
CREATE TABLE IF NOT EXISTS public.boq_project_sections (
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

-- Create boq_items table (line items within sections)
CREATE TABLE IF NOT EXISTS public.boq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.boq_project_sections(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  supply_rate NUMERIC DEFAULT 0,
  install_rate NUMERIC DEFAULT 0,
  total_rate NUMERIC DEFAULT 0,
  supply_cost NUMERIC DEFAULT 0,
  install_cost NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  is_rate_only BOOLEAN DEFAULT false,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_boqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_boqs
CREATE POLICY "Users can view BOQs for their projects"
ON public.project_boqs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_boqs.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create BOQs for their projects"
ON public.project_boqs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_boqs.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update BOQs for their projects"
ON public.project_boqs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_boqs.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete BOQs for their projects"
ON public.project_boqs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = project_boqs.project_id
    AND pm.user_id = auth.uid()
  )
);

-- RLS policies for boq_bills
CREATE POLICY "Users can view bills for their project BOQs"
ON public.boq_bills FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_boqs pb
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE pb.id = boq_bills.project_boq_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create bills for their project BOQs"
ON public.boq_bills FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_boqs pb
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE pb.id = boq_bills.project_boq_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update bills for their project BOQs"
ON public.boq_bills FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_boqs pb
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE pb.id = boq_bills.project_boq_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete bills for their project BOQs"
ON public.boq_bills FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_boqs pb
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE pb.id = boq_bills.project_boq_id
    AND pm.user_id = auth.uid()
  )
);

-- RLS policies for boq_project_sections
CREATE POLICY "Users can view sections for their bills"
ON public.boq_project_sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.boq_bills bb
    JOIN public.project_boqs pb ON pb.id = bb.project_boq_id
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE bb.id = boq_project_sections.bill_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create sections for their bills"
ON public.boq_project_sections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boq_bills bb
    JOIN public.project_boqs pb ON pb.id = bb.project_boq_id
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE bb.id = boq_project_sections.bill_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update sections for their bills"
ON public.boq_project_sections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.boq_bills bb
    JOIN public.project_boqs pb ON pb.id = bb.project_boq_id
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE bb.id = boq_project_sections.bill_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete sections for their bills"
ON public.boq_project_sections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.boq_bills bb
    JOIN public.project_boqs pb ON pb.id = bb.project_boq_id
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE bb.id = boq_project_sections.bill_id
    AND pm.user_id = auth.uid()
  )
);

-- RLS policies for boq_items
CREATE POLICY "Users can view items for their sections"
ON public.boq_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.boq_project_sections bps
    JOIN public.boq_bills bb ON bb.id = bps.bill_id
    JOIN public.project_boqs pb ON pb.id = bb.project_boq_id
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE bps.id = boq_items.section_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create items for their sections"
ON public.boq_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boq_project_sections bps
    JOIN public.boq_bills bb ON bb.id = bps.bill_id
    JOIN public.project_boqs pb ON pb.id = bb.project_boq_id
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE bps.id = boq_items.section_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update items for their sections"
ON public.boq_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.boq_project_sections bps
    JOIN public.boq_bills bb ON bb.id = bps.bill_id
    JOIN public.project_boqs pb ON pb.id = bb.project_boq_id
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE bps.id = boq_items.section_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items for their sections"
ON public.boq_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.boq_project_sections bps
    JOIN public.boq_bills bb ON bb.id = bps.bill_id
    JOIN public.project_boqs pb ON pb.id = bb.project_boq_id
    JOIN public.project_members pm ON pm.project_id = pb.project_id
    WHERE bps.id = boq_items.section_id
    AND pm.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_boqs_project ON public.project_boqs(project_id);
CREATE INDEX IF NOT EXISTS idx_boq_bills_boq ON public.boq_bills(project_boq_id);
CREATE INDEX IF NOT EXISTS idx_boq_project_sections_bill ON public.boq_project_sections(bill_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_section ON public.boq_items(section_id);

-- Create triggers for updated_at
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

-- Function to recalculate section totals
CREATE OR REPLACE FUNCTION public.recalculate_boq_section_total(section_id UUID)
RETURNS void AS $$
DECLARE
  section_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO section_total
  FROM public.boq_items
  WHERE boq_items.section_id = recalculate_boq_section_total.section_id;
  
  UPDATE public.boq_project_sections
  SET total_amount = section_total
  WHERE id = section_id;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate bill totals
CREATE OR REPLACE FUNCTION public.recalculate_boq_bill_total(bill_id UUID)
RETURNS void AS $$
DECLARE
  bill_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO bill_total
  FROM public.boq_project_sections
  WHERE boq_project_sections.bill_id = recalculate_boq_bill_total.bill_id;
  
  UPDATE public.boq_bills
  SET total_amount = bill_total
  WHERE id = bill_id;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate BOQ total
CREATE OR REPLACE FUNCTION public.recalculate_boq_total(boq_id UUID)
RETURNS void AS $$
DECLARE
  boq_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO boq_total
  FROM public.boq_bills
  WHERE boq_bills.project_boq_id = recalculate_boq_total.boq_id;
  
  UPDATE public.project_boqs
  SET total_amount = boq_total
  WHERE id = boq_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate item totals when quantity or rates change
CREATE OR REPLACE FUNCTION public.calculate_boq_item_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total_rate
  NEW.total_rate := COALESCE(NEW.supply_rate, 0) + COALESCE(NEW.install_rate, 0);
  
  -- Calculate costs
  NEW.supply_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.supply_rate, 0);
  NEW.install_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.install_rate, 0);
  NEW.total_amount := NEW.supply_cost + NEW.install_cost;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_boq_item_totals_trigger
BEFORE INSERT OR UPDATE ON public.boq_items
FOR EACH ROW
EXECUTE FUNCTION public.calculate_boq_item_totals();

-- Trigger to recalculate section total when items change
CREATE OR REPLACE FUNCTION public.recalculate_boq_section_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_boq_section_total(COALESCE(NEW.section_id, OLD.section_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_boq_section_on_item_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.boq_items
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_boq_section_on_item_change();

-- Trigger to recalculate bill total when sections change
CREATE OR REPLACE FUNCTION public.recalculate_boq_bill_on_section_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_boq_bill_total(COALESCE(NEW.bill_id, OLD.bill_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_boq_bill_on_section_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.boq_project_sections
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_boq_bill_on_section_change();

-- Trigger to recalculate BOQ total when bills change
CREATE OR REPLACE FUNCTION public.recalculate_boq_on_bill_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_boq_total(COALESCE(NEW.project_boq_id, OLD.project_boq_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_boq_on_bill_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.boq_bills
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_boq_on_bill_change();

