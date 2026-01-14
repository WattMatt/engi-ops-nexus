-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view contact categories" ON public.contact_categories;
DROP POLICY IF EXISTS "Anyone can create contact categories" ON public.contact_categories;
DROP POLICY IF EXISTS "Anyone can delete custom contact categories" ON public.contact_categories;

-- Create proper policies for authenticated users
CREATE POLICY "Authenticated users can view contact categories" 
ON public.contact_categories 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create contact categories" 
ON public.contact_categories 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contact categories" 
ON public.contact_categories 
FOR UPDATE 
TO authenticated
USING (is_custom = true)
WITH CHECK (is_custom = true);

CREATE POLICY "Authenticated users can delete custom contact categories" 
ON public.contact_categories 
FOR DELETE 
TO authenticated
USING (is_custom = true);