-- Create the floor-plan-reports storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('floor-plan-reports', 'floor-plan-reports', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the bucket
CREATE POLICY "Allow authenticated users to upload floor plan reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'floor-plan-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow users to read their own floor plan reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'floor-plan-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow public read access to floor plan reports"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'floor-plan-reports');

CREATE POLICY "Allow users to delete their own floor plan reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'floor-plan-reports' AND auth.uid()::text = (storage.foldername(name))[1]);