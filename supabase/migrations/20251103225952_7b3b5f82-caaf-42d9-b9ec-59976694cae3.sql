-- Make tenant-tracker-reports bucket public for PDF previews
UPDATE storage.buckets 
SET public = true 
WHERE id = 'tenant-tracker-reports';