-- Allow anon to delete pins they can access
CREATE POLICY "Anon delete defect_pins"
ON public.defect_pins
FOR DELETE
TO anon
USING (has_valid_contractor_portal_token(project_id));

-- Allow authenticated to delete pins
CREATE POLICY "Auth delete defect_pins"
ON public.defect_pins
FOR DELETE
TO authenticated
USING (has_project_access(auth.uid(), project_id));

-- Allow anon to delete photos
CREATE POLICY "Anon delete defect_photos"
ON public.defect_photos
FOR DELETE
TO anon
USING (EXISTS (
  SELECT 1 FROM defect_pins dp
  WHERE dp.id = defect_photos.pin_id
  AND has_valid_contractor_portal_token(dp.project_id)
));

-- Allow authenticated to delete photos
CREATE POLICY "Auth delete defect_photos"
ON public.defect_photos
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM defect_pins dp
  WHERE dp.id = defect_photos.pin_id
  AND has_project_access(auth.uid(), dp.project_id)
));