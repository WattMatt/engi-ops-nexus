
-- Allow anon role to INSERT into project_drawings (for external sync scripts)
CREATE POLICY "Allow anon insert on project_drawings"
ON public.project_drawings
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon role to UPDATE project_drawings (for external sync scripts)
CREATE POLICY "Allow anon update on project_drawings"
ON public.project_drawings
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
