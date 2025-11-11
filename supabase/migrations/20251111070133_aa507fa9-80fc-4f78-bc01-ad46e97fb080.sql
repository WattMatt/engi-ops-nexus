-- Create RLS policies for bulk_services_drawings bucket to allow authenticated users to upload

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload bulk services drawings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bulk_services_drawings');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read bulk services drawings"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'bulk_services_drawings');

-- Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update bulk services drawings"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'bulk_services_drawings');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete bulk services drawings"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'bulk_services_drawings');