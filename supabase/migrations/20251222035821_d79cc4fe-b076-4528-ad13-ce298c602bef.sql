-- Create table for prime cost documents
CREATE TABLE public.prime_cost_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prime_cost_item_id UUID NOT NULL REFERENCES public.final_account_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  document_type TEXT DEFAULT 'order',
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prime_cost_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view prime cost documents for accessible projects"
ON public.prime_cost_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM final_account_items fai
    JOIN final_account_sections fas ON fai.section_id = fas.id
    JOIN final_account_bills fab ON fas.bill_id = fab.id
    JOIN final_accounts fa ON fab.final_account_id = fa.id
    JOIN project_members pm ON fa.project_id = pm.project_id
    WHERE fai.id = prime_cost_documents.prime_cost_item_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert prime cost documents for accessible projects"
ON public.prime_cost_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM final_account_items fai
    JOIN final_account_sections fas ON fai.section_id = fas.id
    JOIN final_account_bills fab ON fas.bill_id = fab.id
    JOIN final_accounts fa ON fab.final_account_id = fa.id
    JOIN project_members pm ON fa.project_id = pm.project_id
    WHERE fai.id = prime_cost_documents.prime_cost_item_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete prime cost documents for accessible projects"
ON public.prime_cost_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM final_account_items fai
    JOIN final_account_sections fas ON fai.section_id = fas.id
    JOIN final_account_bills fab ON fas.bill_id = fab.id
    JOIN final_accounts fa ON fab.final_account_id = fa.id
    JOIN project_members pm ON fa.project_id = pm.project_id
    WHERE fai.id = prime_cost_documents.prime_cost_item_id
    AND pm.user_id = auth.uid()
  )
);

-- Create storage bucket for prime cost documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('prime-cost-documents', 'prime-cost-documents', true);

-- Storage policies
CREATE POLICY "Anyone can view prime cost documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'prime-cost-documents');

CREATE POLICY "Authenticated users can upload prime cost documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'prime-cost-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete prime cost documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'prime-cost-documents' AND auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_prime_cost_documents_updated_at
  BEFORE UPDATE ON public.prime_cost_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();