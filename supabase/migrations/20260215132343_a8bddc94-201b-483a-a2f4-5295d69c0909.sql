
-- Create storage bucket for AI prediction reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-prediction-reports', 'ai-prediction-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Create AI prediction reports table
CREATE TABLE public.ai_prediction_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_prediction_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own prediction reports"
ON public.ai_prediction_reports
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert prediction reports"
ON public.ai_prediction_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can delete their own prediction reports"
ON public.ai_prediction_reports
FOR DELETE
TO authenticated
USING (auth.uid() = generated_by);

-- Storage policies for ai-prediction-reports bucket
CREATE POLICY "Authenticated users can upload prediction reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ai-prediction-reports');

CREATE POLICY "Authenticated users can read prediction reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ai-prediction-reports');

CREATE POLICY "Users can delete their own prediction reports from storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ai-prediction-reports');
