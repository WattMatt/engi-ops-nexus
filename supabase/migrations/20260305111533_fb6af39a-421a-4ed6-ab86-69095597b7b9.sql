
CREATE TABLE public.generator_report_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public.generator_report_shares(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  recipient_name TEXT,
  recipient_email TEXT
);

-- Index for fast lookups by share
CREATE INDEX idx_generator_report_access_log_share_id ON public.generator_report_access_log(share_id);
CREATE INDEX idx_generator_report_access_log_project_id ON public.generator_report_access_log(project_id);

-- RLS: only project members can read logs
ALTER TABLE public.generator_report_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view access logs"
  ON public.generator_report_access_log
  FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));
