-- Create report templates table
CREATE TABLE IF NOT EXISTS public.tenant_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  settings JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_report_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view templates for their projects"
  ON public.tenant_report_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tenant_report_templates.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates for their projects"
  ON public.tenant_report_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tenant_report_templates.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates for their projects"
  ON public.tenant_report_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tenant_report_templates.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates for their projects"
  ON public.tenant_report_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = tenant_report_templates.project_id
      AND user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_tenant_report_templates_project_id ON public.tenant_report_templates(project_id);

-- Add trigger for updated_at
CREATE TRIGGER update_tenant_report_templates_updated_at
  BEFORE UPDATE ON public.tenant_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();