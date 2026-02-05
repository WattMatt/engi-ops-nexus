-- Create portal_user_sessions table to track contractor portal visitors
CREATE TABLE public.portal_user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id uuid REFERENCES public.contractor_portal_tokens(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  first_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  access_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(token_id, user_email)
);

-- Create deadline notification log table to track sent notifications
CREATE TABLE public.deadline_notification_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL, -- 'db_deadline' | 'lighting_deadline'
  recipient_email text NOT NULL,
  deadline_date date NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, notification_type, recipient_email, deadline_date)
);

-- Enable RLS
ALTER TABLE public.portal_user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadline_notification_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for portal_user_sessions (allow public insert/select for portal users)
CREATE POLICY "Allow public insert to portal_user_sessions" 
ON public.portal_user_sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public select of own sessions by email" 
ON public.portal_user_sessions FOR SELECT 
USING (true);

CREATE POLICY "Allow public update of own sessions" 
ON public.portal_user_sessions FOR UPDATE 
USING (true);

-- RLS policies for deadline_notification_log (authenticated users only)
CREATE POLICY "Authenticated users can view notification logs" 
ON public.deadline_notification_log FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert notification logs" 
ON public.deadline_notification_log FOR INSERT 
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_portal_user_sessions_project ON public.portal_user_sessions(project_id);
CREATE INDEX idx_portal_user_sessions_token ON public.portal_user_sessions(token_id);
CREATE INDEX idx_portal_user_sessions_email ON public.portal_user_sessions(user_email);
CREATE INDEX idx_deadline_notification_tenant ON public.deadline_notification_log(tenant_id);
CREATE INDEX idx_deadline_notification_date ON public.deadline_notification_log(deadline_date);

-- Add trigger for updated_at
CREATE TRIGGER update_portal_user_sessions_updated_at
BEFORE UPDATE ON public.portal_user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for portal_user_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_user_sessions;