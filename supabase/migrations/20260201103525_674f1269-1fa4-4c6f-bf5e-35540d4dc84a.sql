-- Create report automation settings table
CREATE TABLE public.report_automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'tenant_tracker',
  enabled BOOLEAN NOT NULL DEFAULT false,
  schedule_type TEXT NOT NULL DEFAULT 'weekly' CHECK (schedule_type IN ('weekly', 'monthly', 'specific_date')),
  schedule_day INTEGER CHECK (schedule_day >= 1 AND schedule_day <= 31),
  schedule_time TIME NOT NULL DEFAULT '09:00:00',
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  recipient_emails TEXT[] DEFAULT '{}',
  include_cover_page BOOLEAN NOT NULL DEFAULT true,
  include_kpi_page BOOLEAN NOT NULL DEFAULT true,
  include_tenant_schedule BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(project_id, report_type)
);

-- Enable RLS
ALTER TABLE public.report_automation_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view report automation settings for their projects"
  ON public.report_automation_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = report_automation_settings.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create report automation settings for their projects"
  ON public.report_automation_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = report_automation_settings.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update report automation settings for their projects"
  ON public.report_automation_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = report_automation_settings.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete report automation settings for their projects"
  ON public.report_automation_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = report_automation_settings.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_report_automation_settings_updated_at
  BEFORE UPDATE ON public.report_automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();