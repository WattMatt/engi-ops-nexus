-- Create storage bucket for project and client logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for project-logos bucket
CREATE POLICY "Public can view project logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-logos');

CREATE POLICY "Authenticated users can upload project logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update their project logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete their project logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-logos' 
  AND auth.role() = 'authenticated'
);