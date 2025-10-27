-- Update floor-plans bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'floor-plans';