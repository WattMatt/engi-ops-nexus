
CREATE TABLE public.portal_report_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_portal_report_snapshots_project_date 
  ON public.portal_report_snapshots(project_id, report_date DESC);
