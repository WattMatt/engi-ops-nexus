-- Lighting Report Templates
CREATE TABLE public.lighting_report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lighting Approvals
CREATE TABLE public.lighting_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.project_lighting_schedules(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  section_type TEXT, -- schedule, specification, cost, energy
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested', 'in_review')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lighting_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lighting_report_templates
CREATE POLICY "Users can view templates for their projects"
ON public.lighting_report_templates FOR SELECT
USING (
  project_id IS NULL OR 
  public.has_project_access(auth.uid(), project_id) OR 
  public.is_admin(auth.uid())
);

CREATE POLICY "Users can create templates"
ON public.lighting_report_templates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their templates"
ON public.lighting_report_templates FOR UPDATE
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete their templates"
ON public.lighting_report_templates FOR DELETE
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- RLS Policies for lighting_approvals
CREATE POLICY "Users can view approvals for their projects"
ON public.lighting_approvals FOR SELECT
USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create approvals for their projects"
ON public.lighting_approvals FOR INSERT
WITH CHECK (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update approvals for their projects"
ON public.lighting_approvals FOR UPDATE
USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete approvals for their projects"
ON public.lighting_approvals FOR DELETE
USING (public.has_project_access(auth.uid(), project_id) OR public.is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_lighting_report_templates_updated_at
BEFORE UPDATE ON public.lighting_report_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lighting_approvals_updated_at
BEFORE UPDATE ON public.lighting_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default report templates
INSERT INTO public.lighting_report_templates (name, description, config, is_default) VALUES
('Full Project Report', 'Comprehensive lighting report with all sections', '{
  "includesCoverPage": true,
  "includeTableOfContents": true,
  "sections": {
    "executiveSummary": true,
    "scheduleByTenant": true,
    "scheduleByZone": true,
    "specificationSheets": true,
    "costSummary": true,
    "energyAnalysis": true,
    "approvalStatus": true,
    "comparisons": true
  }
}', true),
('Client Presentation', 'Summary report suitable for client presentations', '{
  "includesCoverPage": true,
  "includeTableOfContents": true,
  "sections": {
    "executiveSummary": true,
    "scheduleByTenant": true,
    "scheduleByZone": false,
    "specificationSheets": true,
    "costSummary": true,
    "energyAnalysis": true,
    "approvalStatus": false,
    "comparisons": false
  }
}', false),
('Internal Review', 'Detailed report for internal team review', '{
  "includesCoverPage": false,
  "includeTableOfContents": false,
  "sections": {
    "executiveSummary": false,
    "scheduleByTenant": true,
    "scheduleByZone": true,
    "specificationSheets": true,
    "costSummary": true,
    "energyAnalysis": true,
    "approvalStatus": true,
    "comparisons": true
  }
}', false),
('Tender Submission', 'Formal document for tender submissions', '{
  "includesCoverPage": true,
  "includeTableOfContents": true,
  "sections": {
    "executiveSummary": true,
    "scheduleByTenant": true,
    "scheduleByZone": true,
    "specificationSheets": true,
    "costSummary": true,
    "energyAnalysis": true,
    "approvalStatus": false,
    "comparisons": false
  }
}', false);