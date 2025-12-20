-- Allow authenticated users to insert master materials from BOQ review
CREATE POLICY "Authenticated users can insert master materials"
ON public.master_materials
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to update materials they inserted (optional, for editing)
CREATE POLICY "Users can update master materials"
ON public.master_materials
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);