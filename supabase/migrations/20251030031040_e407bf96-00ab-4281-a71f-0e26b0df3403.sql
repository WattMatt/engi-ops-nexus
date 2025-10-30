-- Drop existing storage policies for invoices bucket
DROP POLICY IF EXISTS "Users can upload their own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON storage.objects;

-- Create corrected storage policies for invoices bucket
-- The path structure is: historical/{user_id}/{year}/{filename}
-- So we need to check the second folder (index 2) for the user_id
CREATE POLICY "Users can upload their own invoices"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1] = 'historical' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can view their own invoices"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1] = 'historical' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own invoices"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1] = 'historical' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );