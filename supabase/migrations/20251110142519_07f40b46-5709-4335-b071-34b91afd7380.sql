-- Create handover documents table
CREATE TABLE IF NOT EXISTS public.handover_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT,
  source_type TEXT NOT NULL, -- 'upload', 'tenant_document', 'cost_report', 'specification', 'cable_schedule', etc.
  source_id UUID, -- Reference to the source document if linked
  file_size BIGINT,
  added_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create handover links table for shareable client access
CREATE TABLE IF NOT EXISTS public.handover_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  link_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.handover_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for handover_documents
CREATE POLICY "Users can view handover documents for their projects"
  ON public.handover_documents FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can insert handover documents for their projects"
  ON public.handover_documents FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can update handover documents for their projects"
  ON public.handover_documents FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can delete handover documents for their projects"
  ON public.handover_documents FOR DELETE
  USING (is_project_member(auth.uid(), project_id));

-- RLS Policies for handover_links
CREATE POLICY "Users can view handover links for their projects"
  ON public.handover_links FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can create handover links for their projects"
  ON public.handover_links FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can update handover links for their projects"
  ON public.handover_links FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can delete handover links for their projects"
  ON public.handover_links FOR DELETE
  USING (is_project_member(auth.uid(), project_id));

-- Public access policy for handover_links (for client downloads)
CREATE POLICY "Public can view handover links with valid token"
  ON public.handover_links FOR SELECT
  USING (true);

-- Create storage bucket for handover documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('handover-documents', 'handover-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view handover documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'handover-documents');

CREATE POLICY "Authenticated users can upload handover documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'handover-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their handover documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'handover-documents' AND auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_handover_documents_project_id ON public.handover_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_handover_documents_source ON public.handover_documents(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_handover_links_token ON public.handover_links(link_token);
CREATE INDEX IF NOT EXISTS idx_handover_links_project ON public.handover_links(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_handover_documents_updated_at
  BEFORE UPDATE ON public.handover_documents
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();