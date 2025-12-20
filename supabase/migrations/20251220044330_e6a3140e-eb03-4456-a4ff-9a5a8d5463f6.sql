-- Create final account bills table (Bill No. 1 - Mall, Bill No. 2 - Tenant, etc.)
CREATE TABLE public.final_account_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  final_account_id UUID NOT NULL REFERENCES public.final_accounts(id) ON DELETE CASCADE,
  bill_number INTEGER NOT NULL,
  bill_name TEXT NOT NULL,
  description TEXT,
  contract_total NUMERIC DEFAULT 0,
  final_total NUMERIC DEFAULT 0,
  variation_total NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create final account sections table (Section A, B, C, etc.)
CREATE TABLE public.final_account_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.final_account_bills(id) ON DELETE CASCADE,
  section_code TEXT NOT NULL,
  section_name TEXT NOT NULL,
  description TEXT,
  contract_total NUMERIC DEFAULT 0,
  final_total NUMERIC DEFAULT 0,
  variation_total NUMERIC DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Drop old final_account_items and recreate with BOQ structure
DROP TABLE IF EXISTS public.final_account_items;

CREATE TABLE public.final_account_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.final_account_sections(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT,
  contract_quantity NUMERIC DEFAULT 0,
  final_quantity NUMERIC DEFAULT 0,
  supply_rate NUMERIC DEFAULT 0,
  install_rate NUMERIC DEFAULT 0,
  contract_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC DEFAULT 0,
  variation_amount NUMERIC DEFAULT 0,
  is_rate_only BOOLEAN DEFAULT false,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.final_account_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_account_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_account_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for bills
CREATE POLICY "Users can view bills for their final accounts"
ON public.final_account_bills FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.final_accounts fa
  WHERE fa.id = final_account_bills.final_account_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can create bills for their final accounts"
ON public.final_account_bills FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.final_accounts fa
  WHERE fa.id = final_account_bills.final_account_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can update bills for their final accounts"
ON public.final_account_bills FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.final_accounts fa
  WHERE fa.id = final_account_bills.final_account_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can delete bills for their final accounts"
ON public.final_account_bills FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.final_accounts fa
  WHERE fa.id = final_account_bills.final_account_id
  AND fa.created_by = auth.uid()
));

-- RLS policies for sections
CREATE POLICY "Users can view sections for their bills"
ON public.final_account_sections FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.final_account_bills fab
  JOIN public.final_accounts fa ON fa.id = fab.final_account_id
  WHERE fab.id = final_account_sections.bill_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can create sections for their bills"
ON public.final_account_sections FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.final_account_bills fab
  JOIN public.final_accounts fa ON fa.id = fab.final_account_id
  WHERE fab.id = final_account_sections.bill_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can update sections for their bills"
ON public.final_account_sections FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.final_account_bills fab
  JOIN public.final_accounts fa ON fa.id = fab.final_account_id
  WHERE fab.id = final_account_sections.bill_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can delete sections for their bills"
ON public.final_account_sections FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.final_account_bills fab
  JOIN public.final_accounts fa ON fa.id = fab.final_account_id
  WHERE fab.id = final_account_sections.bill_id
  AND fa.created_by = auth.uid()
));

-- RLS policies for items
CREATE POLICY "Users can view items for their sections"
ON public.final_account_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.final_account_sections fas
  JOIN public.final_account_bills fab ON fab.id = fas.bill_id
  JOIN public.final_accounts fa ON fa.id = fab.final_account_id
  WHERE fas.id = final_account_items.section_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can create items for their sections"
ON public.final_account_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.final_account_sections fas
  JOIN public.final_account_bills fab ON fab.id = fas.bill_id
  JOIN public.final_accounts fa ON fa.id = fab.final_account_id
  WHERE fas.id = final_account_items.section_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can update items for their sections"
ON public.final_account_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.final_account_sections fas
  JOIN public.final_account_bills fab ON fab.id = fas.bill_id
  JOIN public.final_accounts fa ON fa.id = fab.final_account_id
  WHERE fas.id = final_account_items.section_id
  AND fa.created_by = auth.uid()
));

CREATE POLICY "Users can delete items for their sections"
ON public.final_account_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.final_account_sections fas
  JOIN public.final_account_bills fab ON fab.id = fas.bill_id
  JOIN public.final_accounts fa ON fa.id = fab.final_account_id
  WHERE fas.id = final_account_items.section_id
  AND fa.created_by = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_final_account_bills_account ON public.final_account_bills(final_account_id);
CREATE INDEX idx_final_account_sections_bill ON public.final_account_sections(bill_id);
CREATE INDEX idx_final_account_items_section ON public.final_account_items(section_id);

-- Trigger for updated_at
CREATE TRIGGER update_final_account_bills_updated_at
BEFORE UPDATE ON public.final_account_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_final_account_sections_updated_at
BEFORE UPDATE ON public.final_account_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_final_account_items_updated_at
BEFORE UPDATE ON public.final_account_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();