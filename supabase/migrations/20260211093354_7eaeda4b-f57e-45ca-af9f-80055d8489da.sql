
-- Create legend card reports table for revision history tracking
CREATE TABLE public.legend_card_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.db_legend_cards(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.legend_card_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view legend card reports" ON public.legend_card_reports
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert legend card reports" ON public.legend_card_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own legend card reports" ON public.legend_card_reports
  FOR DELETE USING (auth.uid() = generated_by);

-- Index for fast lookups
CREATE INDEX idx_legend_card_reports_card_id ON public.legend_card_reports(card_id);
CREATE INDEX idx_legend_card_reports_project_id ON public.legend_card_reports(project_id);
