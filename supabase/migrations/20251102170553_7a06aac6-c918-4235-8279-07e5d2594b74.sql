-- Create table for cable schedule reports
CREATE TABLE public.cable_schedule_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.cable_schedules(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cable_schedule_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for cable_schedule_reports
CREATE POLICY "Users can view reports for their project schedules"
ON public.cable_schedule_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cable_schedules cs
    JOIN public.project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = cable_schedule_reports.schedule_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create reports for their project schedules"
ON public.cable_schedule_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cable_schedules cs
    JOIN public.project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = cable_schedule_reports.schedule_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete reports for their project schedules"
ON public.cable_schedule_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.cable_schedules cs
    JOIN public.project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = cable_schedule_reports.schedule_id
    AND pm.user_id = auth.uid()
  )
);

-- Create storage bucket for cable schedule reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('cable-schedule-reports', 'cable-schedule-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view their project cable schedule reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cable-schedule-reports' AND
  EXISTS (
    SELECT 1 FROM public.cable_schedule_reports csr
    JOIN public.cable_schedules cs ON cs.id = csr.schedule_id
    JOIN public.project_members pm ON pm.project_id = cs.project_id
    WHERE (storage.foldername(name))[1] = csr.schedule_id::text
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload cable schedule reports for their projects"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cable-schedule-reports' AND
  EXISTS (
    SELECT 1 FROM public.cable_schedules cs
    JOIN public.project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = ((storage.foldername(name))[1])::uuid
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their project cable schedule reports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'cable-schedule-reports' AND
  EXISTS (
    SELECT 1 FROM public.cable_schedule_reports csr
    JOIN public.cable_schedules cs ON cs.id = csr.schedule_id
    JOIN public.project_members pm ON pm.project_id = cs.project_id
    WHERE (storage.foldername(name))[1] = csr.schedule_id::text
    AND pm.user_id = auth.uid()
  )
);