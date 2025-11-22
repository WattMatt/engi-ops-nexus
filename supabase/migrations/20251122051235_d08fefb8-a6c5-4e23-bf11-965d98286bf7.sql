-- Add RLS policy for variation_line_items to allow authenticated users to read them
CREATE POLICY "Authenticated users can view variation line items"
ON public.variation_line_items
FOR SELECT
TO authenticated
USING (true);

-- Add RLS policy to allow authenticated users to insert variation line items
CREATE POLICY "Authenticated users can insert variation line items"
ON public.variation_line_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add RLS policy to allow authenticated users to update variation line items
CREATE POLICY "Authenticated users can update variation line items"
ON public.variation_line_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add RLS policy to allow authenticated users to delete variation line items
CREATE POLICY "Authenticated users can delete variation line items"
ON public.variation_line_items
FOR DELETE
TO authenticated
USING (true);