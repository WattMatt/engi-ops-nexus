-- Create table for project outlines (baseline documents)
CREATE TABLE IF NOT EXISTS public.project_outlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL DEFAULT 'BASELINE DOCUMENT',
  project_name TEXT NOT NULL,
  prepared_by TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  address_line3 TEXT,
  telephone TEXT,
  contact_person TEXT,
  date DATE DEFAULT CURRENT_DATE,
  revision TEXT DEFAULT 'Rev 0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for outline sections
CREATE TABLE IF NOT EXISTS public.project_outline_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outline_id UUID NOT NULL REFERENCES public.project_outlines(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL,
  section_title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_outline_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_outlines
CREATE POLICY "Users can view outlines for their projects"
  ON public.project_outlines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_outlines.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create outlines for their projects"
  ON public.project_outlines FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_outlines.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update outlines for their projects"
  ON public.project_outlines FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_outlines.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete outlines for their projects"
  ON public.project_outlines FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = project_outlines.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS Policies for project_outline_sections
CREATE POLICY "Users can view sections for their project outlines"
  ON public.project_outline_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_outlines
      JOIN public.project_members ON project_members.project_id = project_outlines.project_id
      WHERE project_outlines.id = project_outline_sections.outline_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sections for their project outlines"
  ON public.project_outline_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_outlines
      JOIN public.project_members ON project_members.project_id = project_outlines.project_id
      WHERE project_outlines.id = project_outline_sections.outline_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sections for their project outlines"
  ON public.project_outline_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_outlines
      JOIN public.project_members ON project_members.project_id = project_outlines.project_id
      WHERE project_outlines.id = project_outline_sections.outline_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sections for their project outlines"
  ON public.project_outline_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_outlines
      JOIN public.project_members ON project_members.project_id = project_outlines.project_id
      WHERE project_outlines.id = project_outline_sections.outline_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_project_outlines_updated_at
  BEFORE UPDATE ON public.project_outlines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_outline_sections_updated_at
  BEFORE UPDATE ON public.project_outline_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_project_outline_sections_outline_id ON public.project_outline_sections(outline_id);
CREATE INDEX idx_project_outlines_project_id ON public.project_outlines(project_id);