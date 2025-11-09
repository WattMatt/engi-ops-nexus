-- Create table for cover page templates
CREATE TABLE public.cover_page_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  is_default BOOLEAN DEFAULT false,
  field_mappings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.cover_page_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view cover page templates"
ON public.cover_page_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create cover page templates"
ON public.cover_page_templates
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update cover page templates"
ON public.cover_page_templates
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete cover page templates"
ON public.cover_page_templates
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for cover page templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('cover-page-templates', 'cover-page-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can view cover page templates"
ON storage.objects
FOR SELECT
USING (bucket_id = 'cover-page-templates');

CREATE POLICY "Users can upload cover page templates"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'cover-page-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update cover page templates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'cover-page-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete cover page templates"
ON storage.objects
FOR DELETE
USING (bucket_id = 'cover-page-templates' AND auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_cover_page_templates_updated_at
BEFORE UPDATE ON public.cover_page_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();