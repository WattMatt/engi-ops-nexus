-- Create table to track document exclusions (e.g., "By Tenant")
CREATE TABLE IF NOT EXISTS public.tenant_document_exclusions (
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
  exclusion_reason TEXT NOT NULL DEFAULT 'by_tenant',
  notes TEXT,
  marked_by UUID NOT NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, document_type)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tenant_document_exclusions_tenant_id ON public.tenant_document_exclusions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_document_exclusions_project_id ON public.tenant_document_exclusions(project_id);

-- Enable RLS
ALTER TABLE public.tenant_document_exclusions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view exclusions for their project tenants"
  ON public.tenant_document_exclusions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tenant_document_exclusions.project_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert exclusions for their project tenants"
  ON public.tenant_document_exclusions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tenant_document_exclusions.project_id
        AND pm.user_id = auth.uid()
    )
    AND marked_by = auth.uid()
  );

CREATE POLICY "Users can delete exclusions for their project tenants"
  ON public.tenant_document_exclusions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tenant_document_exclusions.project_id
        AND pm.user_id = auth.uid()
    )
  );