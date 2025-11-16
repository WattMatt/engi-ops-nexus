-- Enable authenticated users to upload to document-templates bucket
CREATE POLICY "Authenticated users can upload document templates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-templates'
);

-- Enable authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update document templates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'document-templates'
);

-- Enable authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete document templates"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'document-templates'
);

-- Allow public read access to document templates
CREATE POLICY "Public can view document templates"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'document-templates'
);