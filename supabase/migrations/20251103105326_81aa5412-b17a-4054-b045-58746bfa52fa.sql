-- Add response fields to issue_reports and suggestions tables
ALTER TABLE issue_reports 
ADD COLUMN admin_response text,
ADD COLUMN responded_at timestamp with time zone,
ADD COLUMN responded_by uuid REFERENCES auth.users(id);

ALTER TABLE suggestions 
ADD COLUMN admin_response text,
ADD COLUMN responded_at timestamp with time zone,
ADD COLUMN responded_by uuid REFERENCES auth.users(id);

-- Create a function to notify users of responses
CREATE OR REPLACE FUNCTION notify_user_of_response()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only send notification if admin_response was just added or updated
  IF NEW.admin_response IS NOT NULL AND (OLD.admin_response IS NULL OR OLD.admin_response != NEW.admin_response) THEN
    -- You would integrate with an edge function here for email sending
    -- For now, we'll just update the responded_at timestamp
    NEW.responded_at = now();
    NEW.responded_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for both tables
CREATE TRIGGER issue_response_trigger
  BEFORE UPDATE ON issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_of_response();

CREATE TRIGGER suggestion_response_trigger
  BEFORE UPDATE ON suggestions
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_of_response();