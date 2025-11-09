-- Create bulk_services_reports table for saved PDF reports
CREATE TABLE IF NOT EXISTS public.bulk_services_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.bulk_services_documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  revision TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  comments TEXT
);

-- Enable RLS
ALTER TABLE public.bulk_services_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their project bulk services reports"
  ON public.bulk_services_reports
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bulk services reports for their projects"
  ON public.bulk_services_reports
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project bulk services reports"
  ON public.bulk_services_reports
  FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_bulk_services_reports_document_id ON public.bulk_services_reports(document_id);
CREATE INDEX idx_bulk_services_reports_project_id ON public.bulk_services_reports(project_id);