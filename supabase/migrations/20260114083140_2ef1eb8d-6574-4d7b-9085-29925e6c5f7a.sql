-- Create storage bucket for roadmap PDF exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'roadmap-exports',
  'roadmap-exports',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create table to track exported PDFs
CREATE TABLE public.roadmap_pdf_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  report_type TEXT DEFAULT 'meeting-review',
  exported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  options JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roadmap_pdf_exports ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can view all exports
CREATE POLICY "Authenticated users can view roadmap exports"
  ON public.roadmap_pdf_exports
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own exports
CREATE POLICY "Users can create roadmap exports"
  ON public.roadmap_pdf_exports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = exported_by);

-- Users can delete their own exports (admins can delete any via service role)
CREATE POLICY "Users can delete their own exports"
  ON public.roadmap_pdf_exports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = exported_by);

-- Storage policies for roadmap-exports bucket
CREATE POLICY "Authenticated users can view roadmap exports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'roadmap-exports');

CREATE POLICY "Authenticated users can upload roadmap exports"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'roadmap-exports');

CREATE POLICY "Users can delete their own uploaded exports"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'roadmap-exports' AND auth.uid()::text = (storage.foldername(name))[1]);