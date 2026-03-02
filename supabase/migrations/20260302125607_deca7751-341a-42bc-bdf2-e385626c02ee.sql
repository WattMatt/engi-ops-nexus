
-- Allow anon INSERT on projects table (for sync script auto-creation)
CREATE POLICY "Allow anon insert on projects"
ON public.projects
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon UPDATE on projects table (for sync script updates)
CREATE POLICY "Allow anon update on projects"
ON public.projects
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
