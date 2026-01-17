-- Create notification queue table for scheduling email notifications
CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL DEFAULT 'roadmap_due_reminder',
  roadmap_item_id UUID REFERENCES public.project_roadmap_items(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT
);

-- Create notification log table for tracking sent notifications
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_queue_id UUID REFERENCES public.notification_queue(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  recipient_user_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT DEFAULT 'resend',
  provider_response JSONB,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create notification preferences table for user settings
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_roadmap_reminders BOOLEAN DEFAULT true,
  email_due_date_days INTEGER DEFAULT 3,
  email_frequency TEXT DEFAULT 'daily' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
  email_comment_notifications BOOLEAN DEFAULT true,
  email_status_updates BOOLEAN DEFAULT true,
  email_digest_time TIME DEFAULT '08:00:00',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notification_queue_status ON public.notification_queue(status) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_scheduled ON public.notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_recipient ON public.notification_queue(recipient_user_id);
CREATE INDEX idx_notification_log_recipient ON public.notification_log(recipient_user_id);
CREATE INDEX idx_notification_log_sent_at ON public.notification_log(sent_at DESC);
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Enable RLS on all tables
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_queue
CREATE POLICY "Users can view their own queued notifications"
  ON public.notification_queue FOR SELECT
  USING (recipient_user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage notification queue"
  ON public.notification_queue FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for notification_log
CREATE POLICY "Users can view their own notification history"
  ON public.notification_log FOR SELECT
  USING (recipient_user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage notification logs"
  ON public.notification_log FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to queue roadmap due date notifications
CREATE OR REPLACE FUNCTION public.queue_roadmap_due_notifications(days_ahead INTEGER DEFAULT 3)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      ri.status,
      ri.priority,
      ri.project_id,
      p.name as project_name
    FROM project_roadmap_items ri
    JOIN projects p ON ri.project_id = p.id
    WHERE ri.due_date IS NOT NULL
      AND ri.due_date::date = (CURRENT_DATE + days_ahead)
      AND ri.is_completed = false
      AND ri.status IN ('pending', 'in_progress')
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
          'status', item_record.status,
          'priority', item_record.priority,
          'days_until_due', days_ahead
        )
      );
      queued_count := queued_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN queued_count;
END;
$$;