-- Create handover document exclusions table
CREATE TABLE IF NOT EXISTS public.handover_document_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  exclusion_reason TEXT DEFAULT 'by_tenant',
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, document_type)
);

-- Enable RLS
ALTER TABLE public.handover_document_exclusions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for handover_document_exclusions
CREATE POLICY "Users can view exclusions for their projects"
  ON public.handover_document_exclusions FOR SELECT
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can insert exclusions for their projects"
  ON public.handover_document_exclusions FOR INSERT
  WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can update exclusions for their projects"
  ON public.handover_document_exclusions FOR UPDATE
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Users can delete exclusions for their projects"
  ON public.handover_document_exclusions FOR DELETE
  USING (is_project_member(auth.uid(), project_id));

-- Create index
CREATE INDEX IF NOT EXISTS idx_handover_exclusions_tenant ON public.handover_document_exclusions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_handover_exclusions_project ON public.handover_document_exclusions(project_id);