
-- Allow anon INSERT on project_members (required for handle_new_project trigger)
CREATE POLICY "Allow anon insert on project_members"
ON public.project_members
FOR INSERT
TO anon
WITH CHECK (true);
