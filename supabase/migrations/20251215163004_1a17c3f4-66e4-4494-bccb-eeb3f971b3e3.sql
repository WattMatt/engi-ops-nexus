-- Create storage bucket for lighting spec sheets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lighting-spec-sheets', 
  'lighting-spec-sheets', 
  false, 
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket
CREATE POLICY "Authenticated users can upload spec sheets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lighting-spec-sheets');

CREATE POLICY "Authenticated users can view spec sheets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'lighting-spec-sheets');

CREATE POLICY "Authenticated users can update spec sheets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'lighting-spec-sheets');

CREATE POLICY "Authenticated users can delete spec sheets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'lighting-spec-sheets');