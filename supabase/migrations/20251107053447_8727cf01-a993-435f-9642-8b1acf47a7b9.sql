-- Create tenant_documents table for tracking critical tenant documents
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'lighting_quote_received',
    'lighting_quote_instruction',
    'db_order_quote_received',
    'db_order_instruction',
    'db_shop_drawing_received',
    'db_shop_drawing_approved'
  )),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  notes TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant_id ON public.tenant_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_project_id ON public.tenant_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_document_type ON public.tenant_documents(document_type);

-- Enable RLS
ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_documents
CREATE POLICY "Users can view documents for their project tenants"
  ON public.tenant_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tenant_documents.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents for their project tenants"
  ON public.tenant_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tenant_documents.project_id
        AND pm.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete documents for their project tenants"
  ON public.tenant_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tenant_documents.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Create storage bucket for tenant documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tenant-documents bucket
CREATE POLICY "Users can view tenant documents for their projects"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload tenant documents for their projects"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tenant documents for their projects"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
  );