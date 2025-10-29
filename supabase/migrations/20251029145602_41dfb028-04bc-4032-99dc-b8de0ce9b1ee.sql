-- Create user activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient queries
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);

-- Add last_login_at to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_verification';

-- Enable RLS on activity logs
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all activity logs
CREATE POLICY "Admins can view all activity logs"
ON user_activity_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Allow users to view their own activity logs
CREATE POLICY "Users can view their own activity logs"
ON user_activity_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow system to insert activity logs
CREATE POLICY "System can insert activity logs"
ON user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_action_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO user_activity_logs (user_id, action_type, action_description, metadata)
  VALUES (p_user_id, p_action_type, p_action_description, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to update last login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    last_login_at = now(),
    login_count = COALESCE(login_count, 0) + 1,
    status = 'active'
  WHERE id = NEW.id;
  
  -- Log the login activity
  PERFORM log_user_activity(
    NEW.id,
    'login',
    'User logged in',
    jsonb_build_object('timestamp', now())
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for login tracking
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION update_last_login();

-- Update existing profiles status based on email confirmation
UPDATE profiles
SET status = CASE 
  WHEN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = profiles.id 
    AND auth.users.email_confirmed_at IS NOT NULL
  ) THEN 'active'
  ELSE 'pending_verification'
END
WHERE status IS NULL;