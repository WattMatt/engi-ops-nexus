
-- Verification Certificate Reports
CREATE TABLE public.verification_certificate_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES public.cable_schedule_verifications(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_certificate_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view verification cert reports"
  ON public.verification_certificate_reports FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert verification cert reports"
  ON public.verification_certificate_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Template PDF Reports
CREATE TABLE public.template_pdf_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.template_pdf_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view template pdf reports"
  ON public.template_pdf_reports FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert template pdf reports"
  ON public.template_pdf_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-cert-reports', 'verification-cert-reports', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('template-pdf-reports', 'template-pdf-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Auth users can read verification cert reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-cert-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can upload verification cert reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-cert-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can read template pdf reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-pdf-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can upload template pdf reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'template-pdf-reports' AND auth.uid() IS NOT NULL);
