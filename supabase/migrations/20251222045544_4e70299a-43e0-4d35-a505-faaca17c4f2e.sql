-- Create table to store individual components of prime cost actual values
CREATE TABLE public.prime_cost_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prime_cost_item_id UUID NOT NULL REFERENCES public.final_account_items(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN ('tenant_db_total', 'tenant_lighting_total', 'order', 'manual')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  order_reference TEXT,
  is_auto_calculated BOOLEAN NOT NULL DEFAULT false,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prime_cost_components ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view prime cost components for their projects"
ON public.prime_cost_components
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.final_account_items fai
    JOIN public.final_account_sections fas ON fai.section_id = fas.id
    JOIN public.final_account_bills fab ON fas.bill_id = fab.id
    JOIN public.final_accounts fa ON fab.final_account_id = fa.id
    WHERE fai.id = prime_cost_item_id
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
);

CREATE POLICY "Users can insert prime cost components for their projects"
ON public.prime_cost_components
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.final_account_items fai
    JOIN public.final_account_sections fas ON fai.section_id = fas.id
    JOIN public.final_account_bills fab ON fas.bill_id = fab.id
    JOIN public.final_accounts fa ON fab.final_account_id = fa.id
    WHERE fai.id = prime_cost_item_id
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
);

CREATE POLICY "Users can update prime cost components for their projects"
ON public.prime_cost_components
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.final_account_items fai
    JOIN public.final_account_sections fas ON fai.section_id = fas.id
    JOIN public.final_account_bills fab ON fas.bill_id = fab.id
    JOIN public.final_accounts fa ON fab.final_account_id = fa.id
    WHERE fai.id = prime_cost_item_id
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
);

CREATE POLICY "Users can delete prime cost components for their projects"
ON public.prime_cost_components
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.final_account_items fai
    JOIN public.final_account_sections fas ON fai.section_id = fas.id
    JOIN public.final_account_bills fab ON fas.bill_id = fab.id
    JOIN public.final_accounts fa ON fab.final_account_id = fa.id
    WHERE fai.id = prime_cost_item_id
    AND public.has_project_access(auth.uid(), fa.project_id)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_prime_cost_components_updated_at
BEFORE UPDATE ON public.prime_cost_components
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_prime_cost_components_item_id ON public.prime_cost_components(prime_cost_item_id);