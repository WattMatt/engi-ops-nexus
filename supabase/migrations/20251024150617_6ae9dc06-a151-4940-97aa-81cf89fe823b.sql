-- Create specifications table
CREATE TABLE public.project_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  spec_type TEXT NOT NULL,
  spec_number TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'Rev 0',
  title TEXT NOT NULL,
  prepared_for_company TEXT,
  prepared_for_contact TEXT,
  prepared_for_tel TEXT,
  prepared_for_email TEXT,
  consultant_logo_url TEXT,
  client_logo_url TEXT,
  status TEXT DEFAULT 'draft',
  spec_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create specification sections table
CREATE TABLE public.specification_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spec_id UUID NOT NULL,
  section_number TEXT NOT NULL,
  section_title TEXT NOT NULL,
  section_content TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create specification terms/abbreviations table
CREATE TABLE public.specification_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spec_id UUID NOT NULL,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create specification tables/schedules
CREATE TABLE public.specification_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL,
  table_title TEXT NOT NULL,
  table_data JSONB NOT NULL DEFAULT '{"headers": [], "rows": []}',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specification_tables ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_specifications
CREATE POLICY "Users can view specs for their projects"
  ON public.project_specifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_specifications.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create specs for their projects"
  ON public.project_specifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_specifications.project_id
      AND project_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update specs for their projects"
  ON public.project_specifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_specifications.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete specs for their projects"
  ON public.project_specifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = project_specifications.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS policies for specification_sections
CREATE POLICY "Users can view sections in their specs"
  ON public.specification_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_specifications ps
      JOIN project_members pm ON pm.project_id = ps.project_id
      WHERE ps.id = specification_sections.spec_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sections in their specs"
  ON public.specification_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_specifications ps
      JOIN project_members pm ON pm.project_id = ps.project_id
      WHERE ps.id = specification_sections.spec_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS policies for specification_terms
CREATE POLICY "Users can view terms in their specs"
  ON public.specification_terms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_specifications ps
      JOIN project_members pm ON pm.project_id = ps.project_id
      WHERE ps.id = specification_terms.spec_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage terms in their specs"
  ON public.specification_terms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_specifications ps
      JOIN project_members pm ON pm.project_id = ps.project_id
      WHERE ps.id = specification_terms.spec_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS policies for specification_tables
CREATE POLICY "Users can view tables in their specs"
  ON public.specification_tables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM specification_sections ss
      JOIN project_specifications ps ON ps.id = ss.spec_id
      JOIN project_members pm ON pm.project_id = ps.project_id
      WHERE ss.id = specification_tables.section_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tables in their specs"
  ON public.specification_tables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM specification_sections ss
      JOIN project_specifications ps ON ps.id = ss.spec_id
      JOIN project_members pm ON pm.project_id = ps.project_id
      WHERE ss.id = specification_tables.section_id
      AND pm.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_project_specifications_updated_at
  BEFORE UPDATE ON public.project_specifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_specification_sections_updated_at
  BEFORE UPDATE ON public.specification_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_specification_terms_updated_at
  BEFORE UPDATE ON public.specification_terms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_specification_tables_updated_at
  BEFORE UPDATE ON public.specification_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();