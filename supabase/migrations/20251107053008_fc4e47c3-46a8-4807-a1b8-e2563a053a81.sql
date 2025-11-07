-- Add project_id to user_activity_logs for better audit context
ALTER TABLE user_activity_logs 
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for efficient project-based queries
CREATE INDEX idx_user_activity_logs_project_id ON user_activity_logs(project_id);

-- Update the log_user_activity function to accept project_id
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid, 
  p_action_type text, 
  p_action_description text, 
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_project_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO user_activity_logs (user_id, action_type, action_description, metadata, project_id)
  VALUES (p_user_id, p_action_type, p_action_description, p_metadata, p_project_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;

-- Make floor_plan_projects.project_id NOT NULL for new designs (allow existing NULL values)
-- Add a default check to ensure new floor plans have project assignment
ALTER TABLE floor_plan_projects 
ADD CONSTRAINT floor_plan_projects_project_id_required 
CHECK (project_id IS NOT NULL OR created_at < now());

-- Update RLS policy for floor_plan_projects to be more explicit about project isolation
DROP POLICY IF EXISTS "Users can view their own floor plan projects" ON floor_plan_projects;
CREATE POLICY "Users can view their own floor plan projects" 
ON floor_plan_projects 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR (project_id IS NOT NULL AND is_project_member(auth.uid(), project_id))
);

-- Ensure cable_schedule_reports are properly isolated by project
DROP POLICY IF EXISTS "Users can view reports for their project schedules" ON cable_schedule_reports;
CREATE POLICY "Users can view reports for their project schedules" 
ON cable_schedule_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM cable_schedules cs
    JOIN project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = cable_schedule_reports.schedule_id 
    AND pm.user_id = auth.uid()
  )
);

-- Add validation comment for future reference
COMMENT ON COLUMN user_activity_logs.project_id IS 'Links activity to specific project for audit trail. NULL for global/non-project activities.';