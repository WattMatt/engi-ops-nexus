-- Create storage bucket for document templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('document_templates', 'document_templates', true);

-- RLS Policy: Allow authenticated users to upload templates
CREATE POLICY "Allow authenticated users to upload templates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'document_templates');

-- RLS Policy: Allow authenticated users to read templates
CREATE POLICY "Allow authenticated users to read templates"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'document_templates');

-- RLS Policy: Allow authenticated users to update their own templates
CREATE POLICY "Allow authenticated users to update templates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'document_templates');

-- RLS Policy: Allow authenticated users to delete templates
CREATE POLICY "Allow authenticated users to delete templates"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'document_templates');