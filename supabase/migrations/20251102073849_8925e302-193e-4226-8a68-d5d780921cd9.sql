-- Create table for tenant tracker report documents
CREATE TABLE IF NOT EXISTS public.tenant_tracker_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  tenant_count INTEGER,
  total_area NUMERIC,
  total_db_cost NUMERIC,
  total_lighting_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_tracker_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant tracker reports
CREATE POLICY "Users can view reports for their project"
  ON public.tenant_tracker_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tenant_tracker_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports for their project"
  ON public.tenant_tracker_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tenant_tracker_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete reports for their project"
  ON public.tenant_tracker_reports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tenant_tracker_reports.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_tenant_tracker_reports_project_id 
  ON public.tenant_tracker_reports(project_id);

CREATE INDEX idx_tenant_tracker_reports_revision 
  ON public.tenant_tracker_reports(project_id, revision_number DESC);

-- Create storage bucket for tenant tracker reports (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-tracker-reports', 'tenant-tracker-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tenant tracker reports
CREATE POLICY "Users can view their project reports"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tenant-tracker-reports' AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = (storage.foldername(name))[1]::uuid
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload reports to their projects"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-tracker-reports' AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = (storage.foldername(name))[1]::uuid
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their project reports"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tenant-tracker-reports' AND
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = (storage.foldername(name))[1]::uuid
      AND project_members.user_id = auth.uid()
    )
  );