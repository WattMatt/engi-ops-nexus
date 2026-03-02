CREATE POLICY "Allow anon select on projects"
ON public.projects
FOR SELECT
TO anon
USING (true);