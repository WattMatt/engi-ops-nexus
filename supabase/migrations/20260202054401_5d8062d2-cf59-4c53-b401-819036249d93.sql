-- ================================================================
-- STORAGE SECURITY AUDIT FIX
-- Fixes naming inconsistencies and secures sensitive buckets
-- ================================================================

-- 1. Set sensitive public buckets to private
-- These contain financial/project-specific data that shouldn't be publicly accessible
UPDATE storage.buckets SET public = false WHERE id = 'final-account-reviews';
UPDATE storage.buckets SET public = false WHERE id = 'handover-documents';
UPDATE storage.buckets SET public = false WHERE id = 'tenant-documents';
UPDATE storage.buckets SET public = false WHERE id = 'bulk-services-reports';

-- 2. Drop overly permissive public SELECT policies for now-private buckets
DROP POLICY IF EXISTS "Public read access for review PDFs" ON storage.objects;

-- 3. Create proper authenticated-only SELECT policies for these buckets
CREATE POLICY "Authenticated users can view review PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'final-account-reviews');

CREATE POLICY "Authenticated users can view handover documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'handover-documents');

CREATE POLICY "Authenticated users can view tenant documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'tenant-documents');

CREATE POLICY "Authenticated users can view bulk services reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bulk-services-reports');

-- 4. Add missing INSERT policies for tenant-documents
CREATE POLICY "Authenticated users can upload tenant documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tenant-documents');

-- 5. Add missing INSERT policy for bulk-services-reports
CREATE POLICY "Authenticated users can upload bulk services reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bulk-services-reports');

-- 6. Add UPDATE/DELETE policies for tenant-documents
CREATE POLICY "Authenticated users can update tenant documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tenant-documents');

-- 7. Add UPDATE/DELETE policies for bulk-services-reports  
CREATE POLICY "Authenticated users can update bulk services reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bulk-services-reports');

CREATE POLICY "Authenticated users can delete bulk services reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bulk-services-reports');

-- 8. Add UPDATE policy for handover-documents
CREATE POLICY "Authenticated users can update handover documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'handover-documents');