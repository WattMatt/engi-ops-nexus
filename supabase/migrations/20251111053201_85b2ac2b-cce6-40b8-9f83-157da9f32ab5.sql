-- Create storage bucket for bulk services drawings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bulk_services_drawings', 'bulk_services_drawings', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can view their own project's bulk services drawings
CREATE POLICY "Users can view bulk services drawings for their projects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bulk_services_drawings' AND
  auth.uid() IN (
    SELECT pm.user_id 
    FROM project_members pm
    JOIN bulk_services_documents bsd ON bsd.project_id = pm.project_id
    WHERE (storage.foldername(name))[1] = bsd.id::text
  )
);

-- Policy: Users can upload bulk services drawings for their projects
CREATE POLICY "Users can upload bulk services drawings for their projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bulk_services_drawings' AND
  auth.uid() IN (
    SELECT pm.user_id 
    FROM project_members pm
    JOIN bulk_services_documents bsd ON bsd.project_id = pm.project_id
    WHERE (storage.foldername(name))[1] = bsd.id::text
  )
);

-- Policy: Users can update bulk services drawings for their projects
CREATE POLICY "Users can update bulk services drawings for their projects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bulk_services_drawings' AND
  auth.uid() IN (
    SELECT pm.user_id 
    FROM project_members pm
    JOIN bulk_services_documents bsd ON bsd.project_id = pm.project_id
    WHERE (storage.foldername(name))[1] = bsd.id::text
  )
);

-- Policy: Users can delete bulk services drawings for their projects
CREATE POLICY "Users can delete bulk services drawings for their projects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bulk_services_drawings' AND
  auth.uid() IN (
    SELECT pm.user_id 
    FROM project_members pm
    JOIN bulk_services_documents bsd ON bsd.project_id = pm.project_id
    WHERE (storage.foldername(name))[1] = bsd.id::text
  )
);