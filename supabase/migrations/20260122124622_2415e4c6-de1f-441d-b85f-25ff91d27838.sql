-- Create procurement items table for project-level tracking
CREATE TABLE public.project_procurement_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'final_account'
  source_item_id UUID REFERENCES public.final_account_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  supplier_name TEXT,
  expected_delivery DATE,
  status TEXT NOT NULL DEFAULT 'not_started',
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.project_procurement_items ENABLE ROW LEVEL SECURITY;

-- Create policies for project members
CREATE POLICY "Project members can view procurement items"
ON public.project_procurement_items
FOR SELECT
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members can insert procurement items"
ON public.project_procurement_items
FOR INSERT
WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members can update procurement items"
ON public.project_procurement_items
FOR UPDATE
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Project members can delete procurement items"
ON public.project_procurement_items
FOR DELETE
USING (public.has_project_access(auth.uid(), project_id));

-- Create index for faster lookups
CREATE INDEX idx_procurement_items_project ON public.project_procurement_items(project_id);
CREATE INDEX idx_procurement_items_status ON public.project_procurement_items(status);

-- Add updated_at trigger
CREATE TRIGGER update_procurement_items_updated_at
BEFORE UPDATE ON public.project_procurement_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();