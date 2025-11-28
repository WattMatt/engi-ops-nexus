-- Create finance_documents table for file attachments
CREATE TABLE public.finance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.invoice_projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  document_type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage finance documents" ON public.finance_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoice_projects ip 
      WHERE ip.id = finance_documents.project_id 
      AND (ip.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Create storage bucket for finance documents
INSERT INTO storage.buckets (id, name, public) VALUES ('finance-documents', 'finance-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload finance docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'finance-documents');

CREATE POLICY "Users can view their finance docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'finance-documents');

CREATE POLICY "Users can delete their finance docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'finance-documents');