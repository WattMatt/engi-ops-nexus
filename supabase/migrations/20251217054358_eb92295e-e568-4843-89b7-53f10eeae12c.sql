-- Make the lighting-spec-sheets bucket public
UPDATE storage.buckets SET public = true WHERE id = 'lighting-spec-sheets';