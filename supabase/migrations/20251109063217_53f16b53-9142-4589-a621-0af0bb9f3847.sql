-- Create table for project outline templates
CREATE TABLE IF NOT EXISTS public.project_outline_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  description TEXT,
  document_title TEXT NOT NULL DEFAULT 'BASELINE DOCUMENT',
  prepared_by TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_line3 TEXT,
  telephone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for template sections
CREATE TABLE IF NOT EXISTS public.project_outline_template_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.project_outline_templates(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL,
  section_title TEXT NOT NULL,
  default_content TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_outline_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_outline_template_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_outline_templates
CREATE POLICY "Users can view all templates"
  ON public.project_outline_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own templates"
  ON public.project_outline_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON public.project_outline_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
  ON public.project_outline_templates FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for project_outline_template_sections
CREATE POLICY "Users can view all template sections"
  ON public.project_outline_template_sections FOR SELECT
  USING (true);

CREATE POLICY "Users can create sections for their templates"
  ON public.project_outline_template_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_outline_templates
      WHERE project_outline_templates.id = project_outline_template_sections.template_id
      AND project_outline_templates.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update sections for their templates"
  ON public.project_outline_template_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_outline_templates
      WHERE project_outline_templates.id = project_outline_template_sections.template_id
      AND project_outline_templates.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete sections for their templates"
  ON public.project_outline_template_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_outline_templates
      WHERE project_outline_templates.id = project_outline_template_sections.template_id
      AND project_outline_templates.created_by = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_project_outline_templates_updated_at
  BEFORE UPDATE ON public.project_outline_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_project_outline_template_sections_template_id 
  ON public.project_outline_template_sections(template_id);