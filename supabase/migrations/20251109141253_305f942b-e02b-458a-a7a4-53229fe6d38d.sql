-- Create bulk_services_documents table
CREATE TABLE public.bulk_services_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  document_number TEXT NOT NULL,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  revision TEXT NOT NULL DEFAULT 'Rev 0',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Auto-populated from project baseline
  primary_voltage TEXT,
  connection_size TEXT,
  supply_authority TEXT,
  electrical_standard TEXT,
  diversity_factor NUMERIC(5,2),
  load_category TEXT,
  tariff_structure TEXT,
  
  -- Document specific fields
  total_connected_load NUMERIC(10,2),
  maximum_demand NUMERIC(10,2),
  future_expansion_factor NUMERIC(5,2) DEFAULT 1.20,
  notes TEXT
);

-- Create bulk_services_sections table
CREATE TABLE public.bulk_services_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  section_number TEXT NOT NULL,
  section_title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_services_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_services_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bulk_services_documents
CREATE POLICY "Users can view bulk services documents for their projects"
  ON public.bulk_services_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = bulk_services_documents.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bulk services documents for their projects"
  ON public.bulk_services_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = bulk_services_documents.project_id
      AND project_members.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update bulk services documents for their projects"
  ON public.bulk_services_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = bulk_services_documents.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bulk services documents for their projects"
  ON public.bulk_services_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = bulk_services_documents.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- RLS Policies for bulk_services_sections
CREATE POLICY "Users can view sections in their bulk services documents"
  ON public.bulk_services_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bulk_services_documents bsd
      JOIN project_members pm ON pm.project_id = bsd.project_id
      WHERE bsd.id = bulk_services_sections.document_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage sections in their bulk services documents"
  ON public.bulk_services_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bulk_services_documents bsd
      JOIN project_members pm ON pm.project_id = bsd.project_id
      WHERE bsd.id = bulk_services_sections.document_id
      AND pm.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_bulk_services_documents_project_id ON public.bulk_services_documents(project_id);
CREATE INDEX idx_bulk_services_sections_document_id ON public.bulk_services_sections(document_id);

-- Add trigger for updated_at
CREATE TRIGGER update_bulk_services_documents_updated_at
  BEFORE UPDATE ON public.bulk_services_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_bulk_services_sections_updated_at
  BEFORE UPDATE ON public.bulk_services_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.bulk_services_documents IS 'Bulk electrical services documents with auto-populated baseline data';
COMMENT ON TABLE public.bulk_services_sections IS 'Sections for bulk services documents including supply capacity, distribution strategy, and load calculations';