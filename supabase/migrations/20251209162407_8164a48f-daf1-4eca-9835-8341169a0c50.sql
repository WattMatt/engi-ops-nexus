-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their project portal settings" ON client_portal_settings;
DROP POLICY IF EXISTS "Users can view their project portal settings" ON client_portal_settings;

-- Create better policies that allow project members to manage portal settings
CREATE POLICY "Project members can manage portal settings"
ON client_portal_settings
FOR ALL
USING (
  user_has_project_access(project_id)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  user_has_project_access(project_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);