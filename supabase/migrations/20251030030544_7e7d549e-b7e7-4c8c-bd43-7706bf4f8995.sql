-- Create trigger function for updated_at if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create invoice_uploads table to track PDF uploads and AI processing
CREATE TABLE public.invoice_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data JSONB,
  error_message TEXT,
  project_id UUID REFERENCES public.invoice_projects(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own invoice uploads"
  ON public.invoice_uploads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoice uploads"
  ON public.invoice_uploads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice uploads"
  ON public.invoice_uploads
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice uploads"
  ON public.invoice_uploads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for invoices if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoices bucket
CREATE POLICY "Users can upload their own invoices"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own invoices"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own invoices"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'invoices' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add index for performance
CREATE INDEX idx_invoice_uploads_user_id ON public.invoice_uploads(user_id);
CREATE INDEX idx_invoice_uploads_status ON public.invoice_uploads(processing_status);

-- Add trigger for updated_at
CREATE TRIGGER update_invoice_uploads_updated_at
  BEFORE UPDATE ON public.invoice_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();