-- Create document templates table
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'custom',
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  placeholder_schema JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create template test runs table
CREATE TABLE public.template_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.document_templates(id) ON DELETE CASCADE,
  test_data JSONB NOT NULL,
  output_file_url TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  run_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_test_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can manage document templates"
  ON public.document_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can manage template test runs"
  ON public.template_test_runs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Create storage bucket for document templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-templates', 'document-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Admins can upload document templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'document-templates' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can read document templates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'document-templates' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can delete document templates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'document-templates' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();