-- Create storage bucket for bulk services reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulk-services-reports', 'bulk-services-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for bulk services reports
CREATE POLICY "Users can view their project bulk services reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bulk-services-reports' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload bulk services reports for their projects"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bulk-services-reports' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their project bulk services reports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bulk-services-reports' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);