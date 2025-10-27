-- Create storage policies for floor-plans bucket
-- First, ensure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('floor-plans', 'floor-plans', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload floor plans to their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can view floor plans from their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete floor plans from their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can update floor plans from their projects" ON storage.objects;

-- Create policies for floor-plans bucket
CREATE POLICY "Users can upload floor plans to their projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'floor-plans' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view floor plans from their projects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'floor-plans' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update floor plans from their projects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'floor-plans' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete floor plans from their projects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'floor-plans' AND
  auth.uid() IS NOT NULL
);