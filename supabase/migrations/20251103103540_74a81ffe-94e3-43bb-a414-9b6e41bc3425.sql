-- Create final accounts table
CREATE TABLE public.final_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  client_name TEXT,
  contract_value DECIMAL(15, 2),
  final_value DECIMAL(15, 2),
  variations_total DECIMAL(15, 2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submission_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create final account line items table
CREATE TABLE public.final_account_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  final_account_id UUID NOT NULL REFERENCES public.final_accounts(id) ON DELETE CASCADE,
  item_number TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  contract_quantity DECIMAL(15, 2),
  final_quantity DECIMAL(15, 2),
  rate DECIMAL(15, 2),
  contract_amount DECIMAL(15, 2),
  final_amount DECIMAL(15, 2),
  variation_amount DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.final_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_account_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for final_accounts
CREATE POLICY "Users can view final accounts for their projects"
ON public.final_accounts
FOR SELECT
TO authenticated
USING (
  public.is_project_member(auth.uid(), project_id)
);

CREATE POLICY "Users can create final accounts for their projects"
ON public.final_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_project_member(auth.uid(), project_id)
);

CREATE POLICY "Users can update final accounts for their projects"
ON public.final_accounts
FOR UPDATE
TO authenticated
USING (
  public.is_project_member(auth.uid(), project_id)
);

CREATE POLICY "Users can delete final accounts for their projects"
ON public.final_accounts
FOR DELETE
TO authenticated
USING (
  public.is_project_member(auth.uid(), project_id)
);

-- RLS Policies for final_account_items
CREATE POLICY "Users can view final account items"
ON public.final_account_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.final_accounts
    WHERE final_accounts.id = final_account_items.final_account_id
    AND public.is_project_member(auth.uid(), final_accounts.project_id)
  )
);

CREATE POLICY "Users can create final account items"
ON public.final_account_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.final_accounts
    WHERE final_accounts.id = final_account_items.final_account_id
    AND public.is_project_member(auth.uid(), final_accounts.project_id)
  )
);

CREATE POLICY "Users can update final account items"
ON public.final_account_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.final_accounts
    WHERE final_accounts.id = final_account_items.final_account_id
    AND public.is_project_member(auth.uid(), final_accounts.project_id)
  )
);

CREATE POLICY "Users can delete final account items"
ON public.final_account_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.final_accounts
    WHERE final_accounts.id = final_account_items.final_account_id
    AND public.is_project_member(auth.uid(), final_accounts.project_id)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_final_accounts_updated_at
BEFORE UPDATE ON public.final_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_final_accounts_project_id ON public.final_accounts(project_id);
CREATE INDEX idx_final_account_items_final_account_id ON public.final_account_items(final_account_id);