
-- Create sync log table for monitoring and debugging
CREATE TABLE IF NOT EXISTS public.planner_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  tasks_synced INTEGER DEFAULT 0,
  tasks_errored INTEGER DEFAULT 0,
  projects_processed INTEGER DEFAULT 0,
  plans_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only admins can view sync logs
ALTER TABLE public.planner_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON public.planner_sync_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
