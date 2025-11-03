-- Fix search_path for notify_task_assignment function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;