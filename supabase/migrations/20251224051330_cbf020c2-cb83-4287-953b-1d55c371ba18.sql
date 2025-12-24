-- Create table for prime cost component documents
CREATE TABLE public.prime_cost_component_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.prime_cost_components(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  document_type TEXT DEFAULT 'quote',
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prime_cost_component_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view component documents"
ON public.prime_cost_component_documents
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert component documents"
ON public.prime_cost_component_documents
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update component documents"
ON public.prime_cost_component_documents
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete component documents"
ON public.prime_cost_component_documents
FOR DELETE
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_prime_cost_component_documents_component_id 
ON public.prime_cost_component_documents(component_id);