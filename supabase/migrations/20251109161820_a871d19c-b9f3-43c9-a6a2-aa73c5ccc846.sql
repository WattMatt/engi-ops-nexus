-- Make bulk-services-reports bucket public so PDF previews work
UPDATE storage.buckets 
SET public = true 
WHERE id = 'bulk-services-reports';