-- Create table for electrical budget reports (generated PDFs)
CREATE TABLE public.electrical_budget_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.electrical_budgets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  revision TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.electrical_budget_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view electrical budget reports"
  ON public.electrical_budget_reports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create electrical budget reports"
  ON public.electrical_budget_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete electrical budget reports"
  ON public.electrical_budget_reports
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_electrical_budget_reports_budget_id ON public.electrical_budget_reports(budget_id);
CREATE INDEX idx_electrical_budget_reports_generated_at ON public.electrical_budget_reports(generated_at DESC);