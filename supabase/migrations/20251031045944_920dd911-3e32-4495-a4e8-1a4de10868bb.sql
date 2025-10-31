-- Update floor-plans bucket to allow PNG and JPEG images in addition to PDF
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
WHERE id = 'floor-plans';