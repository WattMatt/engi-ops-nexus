-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoice-pdfs', 'invoice-pdfs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoice PDFs
CREATE POLICY "Authenticated users can upload invoice PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoice-pdfs' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view invoice PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoice-pdfs' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete invoice PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoice-pdfs' 
  AND auth.role() = 'authenticated'
);

-- Add file_path column to invoice_history to store PDF reference
ALTER TABLE public.invoice_history 
ADD COLUMN IF NOT EXISTS pdf_file_path TEXT,
ADD COLUMN IF NOT EXISTS extracted_by_ai BOOLEAN DEFAULT false;