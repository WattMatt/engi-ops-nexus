-- Make document-templates bucket public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'document-templates';