-- Drop existing storage policies if they exist to recreate them correctly
DROP POLICY IF EXISTS "Users can upload their own invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own invoice files" ON storage.objects;

-- Create storage bucket for invoices if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoice files - users can manage files in their own folder
CREATE POLICY "Users can upload invoice files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoices' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR 
     (storage.foldername(name))[1] = 'historical')
  );

CREATE POLICY "Users can view invoice files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoices' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR 
     (storage.foldername(name))[1] = 'historical')
  );

CREATE POLICY "Users can update invoice files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'invoices' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR 
     (storage.foldername(name))[1] = 'historical')
  );

CREATE POLICY "Users can delete invoice files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoices' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR 
     (storage.foldername(name))[1] = 'historical')
  );