-- Create table for storing cost report PDFs
CREATE TABLE public.cost_report_pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_report_id UUID NOT NULL REFERENCES public.cost_reports(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  revision TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.cost_report_pdfs ENABLE ROW LEVEL SECURITY;

-- Create policies for cost_report_pdfs
CREATE POLICY "Users can view cost report PDFs for their projects"
ON public.cost_report_pdfs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cost_reports cr
    WHERE cr.id = cost_report_pdfs.cost_report_id
    AND cr.project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create cost report PDFs for their projects"
ON public.cost_report_pdfs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cost_reports cr
    WHERE cr.id = cost_report_pdfs.cost_report_id
    AND cr.project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete cost report PDFs for their projects"
ON public.cost_report_pdfs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cost_reports cr
    WHERE cr.id = cost_report_pdfs.cost_report_id
    AND cr.project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  )
);

-- Create storage bucket for cost report PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cost-report-pdfs', 'cost-report-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can view cost report PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cost-report-pdfs');

CREATE POLICY "Users can upload cost report PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'cost-report-pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete cost report PDFs"
ON storage.objects
FOR DELETE
USING (bucket_id = 'cost-report-pdfs' AND auth.uid() IS NOT NULL);