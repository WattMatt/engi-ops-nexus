-- Add item type and related fields to boq_items
ALTER TABLE public.boq_items 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'quantity' CHECK (item_type IN ('quantity', 'prime_cost', 'percentage', 'sub_header')),
ADD COLUMN IF NOT EXISTS percentage_value NUMERIC,
ADD COLUMN IF NOT EXISTS reference_item_id UUID REFERENCES public.boq_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS prime_cost_amount NUMERIC;

-- Create BOQ Section Templates table
CREATE TABLE IF NOT EXISTS public.boq_section_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_standard BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create BOQ Item Templates table
CREATE TABLE IF NOT EXISTS public.boq_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_template_id UUID REFERENCES public.boq_section_templates(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  item_type TEXT DEFAULT 'quantity' CHECK (item_type IN ('quantity', 'prime_cost', 'percentage', 'sub_header')),
  unit TEXT,
  default_quantity NUMERIC,
  default_supply_rate NUMERIC,
  default_install_rate NUMERIC,
  default_percentage NUMERIC,
  reference_item_code TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boq_section_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_item_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates (readable by all authenticated users)
CREATE POLICY "Templates are viewable by authenticated users"
ON public.boq_section_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Item templates are viewable by authenticated users"
ON public.boq_item_templates FOR SELECT
TO authenticated
USING (true);

-- Seed standard section templates
INSERT INTO public.boq_section_templates (section_code, section_name, description, category, display_order) VALUES
('A', 'PRELIMINARY & GENERAL', 'All Preliminary and General costs that the Contractor allow in terms of the Standard JBCC Sub Contract and this specific contract', 'preliminary', 1),
('B', 'PRICE FIXING', 'Price escalation and fixing provisions for the contract period', 'preliminary', 2),
('B2', 'MINIATURE SUBSTATIONS', 'Supply, delivery and installation of miniature substations including earthing and plinths', 'medium_voltage', 3),
('C', 'LV RETICULATION', 'Low voltage cables, containment and accessories', 'lv_systems', 4),
('D', 'DISTRIBUTION BOARDS', 'Supply and installation of distribution boards and protective devices', 'lv_systems', 5),
('E', 'LIGHTING', 'Lighting fixtures, controls and emergency lighting', 'lighting', 6),
('F', 'SMALL POWER', 'Socket outlets, isolators and small power installations', 'small_power', 7),
('G', 'EARTHING & LIGHTNING PROTECTION', 'Earthing systems and lightning protection installations', 'earthing', 8),
('H', 'FIRE DETECTION', 'Fire detection and alarm systems', 'fire', 9),
('I', 'CCTV & ACCESS CONTROL', 'Security systems including CCTV and access control', 'security', 10);

-- Seed item templates for Preliminary & General (A)
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'A1', 'Time Based', 'prime_cost', 'Sum', 1 FROM public.boq_section_templates WHERE section_code = 'A';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'A2', 'Value Based', 'prime_cost', 'Sum', 2 FROM public.boq_section_templates WHERE section_code = 'A';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'A3', 'Fixed', 'prime_cost', 'Sum', 3 FROM public.boq_section_templates WHERE section_code = 'A';

-- Seed item templates for Price Fixing (B)
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'B1', 'Amount to keep prices of material and labour firm and fixed to the end of contract', 'prime_cost', 'Sum', 1 FROM public.boq_section_templates WHERE section_code = 'B';

-- Seed item templates for Miniature Substations (B2)
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'B2.1', 'Prime Cost amount to cover the cost for the supply and delivery to site of miniature substations', 'prime_cost', 'Sum', 1 FROM public.boq_section_templates WHERE section_code = 'B2';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, default_percentage, reference_item_code, display_order)
SELECT id, 'B2.2', 'Allow profit to item B2.1', 'percentage', '%', 7.5, 'B2.1', 2 FROM public.boq_section_templates WHERE section_code = 'B2';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'B2.3', 'Allow for installation of miniature substations', 'sub_header', NULL, 3 FROM public.boq_section_templates WHERE section_code = 'B2';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, default_quantity, display_order)
SELECT id, 'B2.3.1', '1,000kVA', 'quantity', 'No', 1, 4 FROM public.boq_section_templates WHERE section_code = 'B2';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'B2.4', 'Allow for pre-cast concrete plinth for miniature substations', 'sub_header', NULL, 5 FROM public.boq_section_templates WHERE section_code = 'B2';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, default_quantity, display_order)
SELECT id, 'B2.4.1', '1,000kVA', 'quantity', 'No', 1, 6 FROM public.boq_section_templates WHERE section_code = 'B2';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'B2.5', 'Earthing of Miniature substations', 'sub_header', NULL, 7 FROM public.boq_section_templates WHERE section_code = 'B2';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'B2.5.1', 'Prime Cost amount for earthing of miniature substations', 'prime_cost', 'Sum', 8 FROM public.boq_section_templates WHERE section_code = 'B2';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, default_percentage, reference_item_code, display_order)
SELECT id, 'B2.5.2', 'Add profit to item B2.5.1', 'percentage', '%', 10, 'B2.5.1', 9 FROM public.boq_section_templates WHERE section_code = 'B2';

-- Seed item templates for LV Reticulation (C)
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'C1', 'LV CABLES', 'sub_header', NULL, 1 FROM public.boq_section_templates WHERE section_code = 'C';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'C1.1', 'Prime Cost amount for supply of LV cables', 'prime_cost', 'Sum', 2 FROM public.boq_section_templates WHERE section_code = 'C';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, default_percentage, reference_item_code, display_order)
SELECT id, 'C1.2', 'Add profit to item C1.1', 'percentage', '%', 10, 'C1.1', 3 FROM public.boq_section_templates WHERE section_code = 'C';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'C2', 'CABLE CONTAINMENT', 'sub_header', NULL, 4 FROM public.boq_section_templates WHERE section_code = 'C';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'C2.1', 'Cable ladder 450mm wide', 'quantity', 'm', 5 FROM public.boq_section_templates WHERE section_code = 'C';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'C2.2', 'Cable ladder 300mm wide', 'quantity', 'm', 6 FROM public.boq_section_templates WHERE section_code = 'C';

-- Seed item templates for Distribution Boards (D)
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'D1', 'MAIN DISTRIBUTION BOARDS', 'sub_header', NULL, 1 FROM public.boq_section_templates WHERE section_code = 'D';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'D1.1', 'Prime Cost amount for supply of main distribution boards', 'prime_cost', 'Sum', 2 FROM public.boq_section_templates WHERE section_code = 'D';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, default_percentage, reference_item_code, display_order)
SELECT id, 'D1.2', 'Add profit to item D1.1', 'percentage', '%', 10, 'D1.1', 3 FROM public.boq_section_templates WHERE section_code = 'D';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'D1.3', 'Allow for installation of main distribution boards', 'quantity', 'No', 4 FROM public.boq_section_templates WHERE section_code = 'D';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'D2', 'SUB DISTRIBUTION BOARDS', 'sub_header', NULL, 5 FROM public.boq_section_templates WHERE section_code = 'D';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, display_order)
SELECT id, 'D2.1', 'Prime Cost amount for supply of sub distribution boards', 'prime_cost', 'Sum', 6 FROM public.boq_section_templates WHERE section_code = 'D';
INSERT INTO public.boq_item_templates (section_template_id, item_code, description, item_type, unit, default_percentage, reference_item_code, display_order)
SELECT id, 'D2.2', 'Add profit to item D2.1', 'percentage', '%', 10, 'D2.1', 7 FROM public.boq_section_templates WHERE section_code = 'D';

-- Create function to calculate BOQ item amount based on type
CREATE OR REPLACE FUNCTION public.calculate_boq_item_amount()
RETURNS TRIGGER AS $$
DECLARE
  ref_amount NUMERIC;
BEGIN
  CASE NEW.item_type
    WHEN 'quantity' THEN
      NEW.total_rate := COALESCE(NEW.supply_rate, 0) + COALESCE(NEW.install_rate, 0);
      NEW.supply_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.supply_rate, 0);
      NEW.install_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.install_rate, 0);
      NEW.total_amount := NEW.supply_cost + NEW.install_cost;
    WHEN 'prime_cost' THEN
      NEW.total_rate := 0;
      NEW.supply_cost := COALESCE(NEW.prime_cost_amount, 0);
      NEW.install_cost := 0;
      NEW.total_amount := COALESCE(NEW.prime_cost_amount, 0);
    WHEN 'percentage' THEN
      IF NEW.reference_item_id IS NOT NULL THEN
        SELECT total_amount INTO ref_amount FROM public.boq_items WHERE id = NEW.reference_item_id;
        NEW.total_amount := COALESCE(ref_amount, 0) * (COALESCE(NEW.percentage_value, 0) / 100);
      ELSE
        NEW.total_amount := 0;
      END IF;
      NEW.total_rate := 0;
      NEW.supply_cost := 0;
      NEW.install_cost := 0;
    WHEN 'sub_header' THEN
      NEW.total_rate := 0;
      NEW.supply_cost := 0;
      NEW.install_cost := 0;
      NEW.total_amount := 0;
    ELSE
      NEW.total_rate := COALESCE(NEW.supply_rate, 0) + COALESCE(NEW.install_rate, 0);
      NEW.supply_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.supply_rate, 0);
      NEW.install_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.install_rate, 0);
      NEW.total_amount := NEW.supply_cost + NEW.install_cost;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS calculate_boq_item_amount_trigger ON public.boq_items;
CREATE TRIGGER calculate_boq_item_amount_trigger
  BEFORE INSERT OR UPDATE ON public.boq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_boq_item_amount();

-- Function to update percentage items when referenced item changes
CREATE OR REPLACE FUNCTION public.update_percentage_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all percentage items that reference this item
  UPDATE public.boq_items
  SET total_amount = NEW.total_amount * (percentage_value / 100)
  WHERE reference_item_id = NEW.id AND item_type = 'percentage';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for cascading percentage updates
DROP TRIGGER IF EXISTS update_percentage_items_trigger ON public.boq_items;
CREATE TRIGGER update_percentage_items_trigger
  AFTER UPDATE OF total_amount ON public.boq_items
  FOR EACH ROW
  WHEN (OLD.total_amount IS DISTINCT FROM NEW.total_amount)
  EXECUTE FUNCTION public.update_percentage_items();