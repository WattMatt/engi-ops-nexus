-- Create a storage bucket for project drawing files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-drawings', 
  'project-drawings', 
  true,
  52428800, -- 50MB limit for large PDFs
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the project-drawings bucket
CREATE POLICY "Authenticated users can view project drawings" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'project-drawings');

CREATE POLICY "Authenticated users can upload project drawings" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'project-drawings');

CREATE POLICY "Authenticated users can update project drawings" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'project-drawings');

CREATE POLICY "Authenticated users can delete project drawings" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'project-drawings');