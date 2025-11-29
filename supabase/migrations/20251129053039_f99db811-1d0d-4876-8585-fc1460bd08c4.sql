-- Add new columns to boq_extracted_items for multi-bill sectioned BOQs
ALTER TABLE public.boq_extracted_items
ADD COLUMN IF NOT EXISTS bill_number integer,
ADD COLUMN IF NOT EXISTS bill_name text,
ADD COLUMN IF NOT EXISTS section_code text,
ADD COLUMN IF NOT EXISTS section_name text,
ADD COLUMN IF NOT EXISTS is_rate_only boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS supply_cost numeric,
ADD COLUMN IF NOT EXISTS install_cost numeric,
ADD COLUMN IF NOT EXISTS profit_percentage numeric,
ADD COLUMN IF NOT EXISTS prime_cost numeric;

-- Create boq_sections reference table for standard section mappings
CREATE TABLE IF NOT EXISTS public.boq_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_code text NOT NULL,
  section_name text NOT NULL,
  category_mapping_id uuid REFERENCES public.material_categories(id),
  display_order integer DEFAULT 0,
  is_standard boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boq_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies for boq_sections
CREATE POLICY "Anyone can view boq_sections"
ON public.boq_sections FOR SELECT
USING (true);

CREATE POLICY "Admins can manage boq_sections"
ON public.boq_sections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert standard electrical BOQ sections
INSERT INTO public.boq_sections (section_code, section_name, display_order) VALUES
('A', 'Preliminaries & General', 1),
('B', 'Medium Voltage Equipment', 2),
('C', 'Standby Plant', 3),
('D', 'Low Voltage Distribution', 4),
('E', 'Final Circuits & Wiring', 5),
('F', 'Lighting', 6),
('G', 'Small Power', 7),
('H', 'Fire Detection & Alarm', 8),
('I', 'Data & Communications', 9),
('J', 'CCTV & Security', 10),
('K', 'Access Control', 11),
('L', 'Earthing & Lightning Protection', 12),
('M', 'Testing & Commissioning', 13),
('N', 'Builders Work', 14)
ON CONFLICT DO NOTHING;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_boq_extracted_items_bill ON public.boq_extracted_items(upload_id, bill_number, section_code);