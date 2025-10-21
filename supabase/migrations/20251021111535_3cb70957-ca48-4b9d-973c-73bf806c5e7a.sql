-- Create variation line items table
CREATE TABLE public.variation_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variation_id UUID NOT NULL REFERENCES public.cost_variations(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  comments TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.variation_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view line items in their variations"
ON public.variation_line_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cost_variations cv
    JOIN cost_reports cr ON cr.id = cv.cost_report_id
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cv.id = variation_line_items.variation_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert line items in their variations"
ON public.variation_line_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cost_variations cv
    JOIN cost_reports cr ON cr.id = cv.cost_report_id
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cv.id = variation_line_items.variation_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update line items in their variations"
ON public.variation_line_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cost_variations cv
    JOIN cost_reports cr ON cr.id = cv.cost_report_id
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cv.id = variation_line_items.variation_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete line items in their variations"
ON public.variation_line_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cost_variations cv
    JOIN cost_reports cr ON cr.id = cv.cost_report_id
    JOIN project_members pm ON pm.project_id = cr.project_id
    WHERE cv.id = variation_line_items.variation_id
    AND pm.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_variation_line_items_updated_at
BEFORE UPDATE ON public.variation_line_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better query performance
CREATE INDEX idx_variation_line_items_variation_id ON public.variation_line_items(variation_id);
CREATE INDEX idx_variation_line_items_display_order ON public.variation_line_items(display_order);