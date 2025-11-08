-- Drop the old log_user_activity function without project_id parameter
DROP FUNCTION IF EXISTS public.log_user_activity(uuid, text, text, jsonb);

-- Ensure we keep the version with project_id
-- This function already exists, just ensuring it's the only one
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid, 
  p_action_type text, 
  p_action_description text, 
  p_metadata jsonb DEFAULT '{}'::jsonb, 
  p_project_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO user_activity_logs (user_id, action_type, action_description, metadata, project_id)
  VALUES (p_user_id, p_action_type, p_action_description, p_metadata, p_project_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;