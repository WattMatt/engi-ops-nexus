
-- =============================================
-- Report History Tables for 5 Migrated Reports
-- =============================================

-- 1. Final Account Reports
CREATE TABLE public.final_account_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  final_account_id UUID NOT NULL,
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.final_account_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view final account reports" ON public.final_account_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert final account reports" ON public.final_account_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete final account reports" ON public.final_account_reports FOR DELETE USING (auth.uid() IS NOT NULL);

-- 2. Specification Reports
CREATE TABLE public.specification_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  specification_id UUID NOT NULL,
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.specification_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view specification reports" ON public.specification_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert specification reports" ON public.specification_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete specification reports" ON public.specification_reports FOR DELETE USING (auth.uid() IS NOT NULL);

-- 3. Handover Completion Reports
CREATE TABLE public.handover_completion_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.handover_completion_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view handover reports" ON public.handover_completion_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert handover reports" ON public.handover_completion_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete handover reports" ON public.handover_completion_reports FOR DELETE USING (auth.uid() IS NOT NULL);

-- 4. Project Outline Reports
CREATE TABLE public.project_outline_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outline_id UUID NOT NULL,
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_outline_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outline reports" ON public.project_outline_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert outline reports" ON public.project_outline_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete outline reports" ON public.project_outline_reports FOR DELETE USING (auth.uid() IS NOT NULL);

-- 5. Site Diary Reports
CREATE TABLE public.site_diary_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  report_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'R01',
  file_path TEXT NOT NULL,
  file_size INTEGER,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_diary_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site diary reports" ON public.site_diary_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert site diary reports" ON public.site_diary_reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete site diary reports" ON public.site_diary_reports FOR DELETE USING (auth.uid() IS NOT NULL);

-- =============================================
-- Storage Buckets
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('final-account-reports', 'final-account-reports', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('specification-reports', 'specification-reports', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('handover-completion-reports', 'handover-completion-reports', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('project-outline-reports', 'project-outline-reports', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('site-diary-reports', 'site-diary-reports', false);

-- Storage RLS policies for all 5 buckets
CREATE POLICY "Authenticated users can upload final account reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'final-account-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view final account reports" ON storage.objects FOR SELECT USING (bucket_id = 'final-account-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete final account report files" ON storage.objects FOR DELETE USING (bucket_id = 'final-account-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload specification reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'specification-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view specification reports" ON storage.objects FOR SELECT USING (bucket_id = 'specification-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete specification report files" ON storage.objects FOR DELETE USING (bucket_id = 'specification-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload handover reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'handover-completion-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view handover reports" ON storage.objects FOR SELECT USING (bucket_id = 'handover-completion-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete handover report files" ON storage.objects FOR DELETE USING (bucket_id = 'handover-completion-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload outline reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-outline-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view outline reports" ON storage.objects FOR SELECT USING (bucket_id = 'project-outline-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete outline report files" ON storage.objects FOR DELETE USING (bucket_id = 'project-outline-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload site diary reports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-diary-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view site diary reports" ON storage.objects FOR SELECT USING (bucket_id = 'site-diary-reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete site diary report files" ON storage.objects FOR DELETE USING (bucket_id = 'site-diary-reports' AND auth.uid() IS NOT NULL);
