-- Create table for Line Shop subsections (individual shops within Section E)
CREATE TABLE public.final_account_shop_subsections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.final_account_sections(id) ON DELETE CASCADE,
  shop_number TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  contract_total NUMERIC NOT NULL DEFAULT 0,
  final_total NUMERIC NOT NULL DEFAULT 0,
  variation_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add shop_subsection_id to final_account_items for linking items to specific shops
ALTER TABLE public.final_account_items 
ADD COLUMN shop_subsection_id UUID REFERENCES public.final_account_shop_subsections(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.final_account_shop_subsections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow authenticated users to manage shop subsections)
CREATE POLICY "Users can view shop subsections"
ON public.final_account_shop_subsections
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create shop subsections"
ON public.final_account_shop_subsections
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update shop subsections"
ON public.final_account_shop_subsections
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete shop subsections"
ON public.final_account_shop_subsections
FOR DELETE
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_final_account_shop_subsections_updated_at
BEFORE UPDATE ON public.final_account_shop_subsections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_shop_subsections_section_id ON public.final_account_shop_subsections(section_id);