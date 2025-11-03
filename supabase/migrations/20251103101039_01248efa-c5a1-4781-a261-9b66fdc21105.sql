-- Create trigger function for task assignment notifications
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assigned_to changed and is not null
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    
    -- Insert notification
    INSERT INTO status_notifications (
      user_id,
      notification_type,
      title,
      description,
      link,
      metadata
    ) VALUES (
      NEW.assigned_to,
      'task_assigned',
      'New Task Assigned',
      'You have been assigned to: ' || NEW.title,
      '/dashboard/site-diary',
      jsonb_build_object(
        'task_id', NEW.id,
        'project_id', NEW.project_id,
        'task_title', NEW.title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on site_diary_tasks
DROP TRIGGER IF EXISTS on_task_assignment ON site_diary_tasks;
CREATE TRIGGER on_task_assignment
  AFTER INSERT OR UPDATE OF assigned_to ON site_diary_tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();