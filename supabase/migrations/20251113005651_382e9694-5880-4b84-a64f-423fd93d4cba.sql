-- Create cover_page_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cover_page_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cover_page_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all cover page templates" ON public.cover_page_templates;
DROP POLICY IF EXISTS "Users can insert their own cover page templates" ON public.cover_page_templates;
DROP POLICY IF EXISTS "Users can update their own cover page templates" ON public.cover_page_templates;
DROP POLICY IF EXISTS "Users can delete their own cover page templates" ON public.cover_page_templates;

-- Create policies for cover_page_templates table
CREATE POLICY "Users can view all cover page templates"
  ON public.cover_page_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own cover page templates"
  ON public.cover_page_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own cover page templates"
  ON public.cover_page_templates
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own cover page templates"
  ON public.cover_page_templates
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create storage bucket for cover page templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('cover-page-templates', 'cover-page-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can view cover page templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload cover page templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own cover page templates storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own cover page templates storage" ON storage.objects;

-- Storage policies for cover-page-templates bucket
CREATE POLICY "Anyone can view cover page templates"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'cover-page-templates');

CREATE POLICY "Authenticated users can upload cover page templates"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'cover-page-templates' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own cover page templates storage"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'cover-page-templates'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own cover page templates storage"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'cover-page-templates'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );