-- Fix the queue_roadmap_due_notifications function to not reference non-existent 'status' column
CREATE OR REPLACE FUNCTION public.queue_roadmap_due_notifications(days_ahead INTEGER DEFAULT 3)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  queued_count INTEGER := 0;
  item_record RECORD;
  member_record RECORD;
BEGIN
  -- Find roadmap items due in X days that haven't been notified yet
  FOR item_record IN
    SELECT 
      ri.id as roadmap_item_id,
      ri.title,
      ri.due_date,
      ri.priority,
      ri.project_id,
      p.name as project_name
    FROM project_roadmap_items ri
    JOIN projects p ON ri.project_id = p.id
    WHERE ri.due_date IS NOT NULL
      AND ri.due_date::date = (CURRENT_DATE + days_ahead)
      AND ri.is_completed = false
      AND NOT EXISTS (
        SELECT 1 FROM notification_queue nq
        WHERE nq.roadmap_item_id = ri.id
          AND nq.notification_type = 'roadmap_due_reminder'
          AND nq.scheduled_for::date = CURRENT_DATE
      )
  LOOP
    -- Queue notifications for all project members
    FOR member_record IN
      SELECT 
        pm.user_id,
        pr.email
      FROM project_members pm
      JOIN profiles pr ON pm.user_id = pr.id
      LEFT JOIN notification_preferences np ON pm.user_id = np.user_id
      WHERE pm.project_id = item_record.project_id
        AND (np.email_roadmap_reminders IS NULL OR np.email_roadmap_reminders = true)
    LOOP
      INSERT INTO notification_queue (
        notification_type,
        roadmap_item_id,
        project_id,
        recipient_user_id,
        recipient_email,
        scheduled_for,
        metadata
      ) VALUES (
        'roadmap_due_reminder',
        item_record.roadmap_item_id,
        item_record.project_id,
        member_record.user_id,
        member_record.email,
        now(),
        jsonb_build_object(
          'item_title', item_record.title,
          'project_name', item_record.project_name,
          'due_date', item_record.due_date,
          'status', 'pending',
          'priority', COALESCE(item_record.priority, 'medium'),
          'days_until_due', days_ahead
        )
      );
      queued_count := queued_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN queued_count;
END;
$$;