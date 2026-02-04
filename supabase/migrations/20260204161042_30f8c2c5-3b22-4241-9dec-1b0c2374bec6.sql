-- Make project-drawings bucket public so contractor portal can access files
UPDATE storage.buckets 
SET public = true 
WHERE id = 'project-drawings';

-- Ensure public read access policy exists
DROP POLICY IF EXISTS "Public read access for project-drawings" ON storage.objects;
CREATE POLICY "Public read access for project-drawings"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-drawings');