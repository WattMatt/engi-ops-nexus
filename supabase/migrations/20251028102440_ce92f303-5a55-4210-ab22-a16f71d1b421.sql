-- Create storage bucket for floor plan PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plans', 'floor-plans', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for floor-plans bucket
CREATE POLICY "Users can upload their own floor plan PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'floor-plans' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own floor plan PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'floor-plans' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own floor plan PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'floor-plans' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own floor plan PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'floor-plans' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
