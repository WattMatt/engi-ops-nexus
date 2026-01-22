-- Create table for budget reference drawings
CREATE TABLE public.budget_reference_drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.electrical_budgets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  description TEXT,
  drawing_number TEXT,
  revision TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_reference_drawings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view budget reference drawings"
ON public.budget_reference_drawings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert budget reference drawings"
ON public.budget_reference_drawings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update budget reference drawings"
ON public.budget_reference_drawings
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete budget reference drawings"
ON public.budget_reference_drawings
FOR DELETE
TO authenticated
USING (true);

-- Create storage bucket for budget drawings
INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-drawings', 'budget-drawings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for budget drawings
CREATE POLICY "Anyone can view budget drawings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'budget-drawings');

CREATE POLICY "Authenticated users can upload budget drawings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'budget-drawings');

CREATE POLICY "Authenticated users can update budget drawings"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'budget-drawings');

CREATE POLICY "Authenticated users can delete budget drawings"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'budget-drawings');

-- Add updated_at trigger
CREATE TRIGGER update_budget_reference_drawings_updated_at
BEFORE UPDATE ON public.budget_reference_drawings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();