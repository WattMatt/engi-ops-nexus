
-- Create audit log table for agent gateway access
CREATE TABLE public.agent_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method TEXT NOT NULL,
  table_name TEXT NOT NULL,
  query_params JSONB DEFAULT '{}',
  response_status INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but allow service role full access (edge function uses service role)
ALTER TABLE public.agent_access_log ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can read logs
CREATE POLICY "Admins can view agent access logs"
  ON public.agent_access_log
  FOR SELECT
  USING (public.is_admin(auth.uid()));
