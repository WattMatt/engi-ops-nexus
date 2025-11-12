-- Create PDF templates table
CREATE TABLE public.pdf_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_json JSONB NOT NULL,
  thumbnail TEXT,
  category TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;

-- Policies for pdf_templates
CREATE POLICY "Users can view templates in their projects"
  ON public.pdf_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = pdf_templates.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates in their projects"
  ON public.pdf_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = pdf_templates.project_id
      AND project_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own templates"
  ON public.pdf_templates
  FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.pdf_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pdf_templates_updated_at
  BEFORE UPDATE ON public.pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_pdf_templates_project_id ON public.pdf_templates(project_id);
CREATE INDEX idx_pdf_templates_category ON public.pdf_templates(category);