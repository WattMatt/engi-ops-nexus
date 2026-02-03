-- Phase 2: Enhanced Data Model for Procurement System

-- 2.1 Add new columns to project_procurement_items
ALTER TABLE public.project_procurement_items 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS po_number TEXT,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS supplier_email TEXT,
ADD COLUMN IF NOT EXISTS supplier_phone TEXT,
ADD COLUMN IF NOT EXISTS quoted_amount NUMERIC,
ADD COLUMN IF NOT EXISTS actual_amount NUMERIC,
ADD COLUMN IF NOT EXISTS quote_valid_until DATE,
ADD COLUMN IF NOT EXISTS actual_delivery DATE,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- 2.2 Create procurement_status_history table
CREATE TABLE IF NOT EXISTS public.procurement_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_item_id UUID NOT NULL REFERENCES public.project_procurement_items(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_procurement_status_history_item 
ON public.procurement_status_history(procurement_item_id);

CREATE INDEX IF NOT EXISTS idx_procurement_status_history_created 
ON public.procurement_status_history(created_at DESC);

-- Enable RLS on procurement_status_history
ALTER TABLE public.procurement_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for procurement_status_history
CREATE POLICY "Users can view procurement history for their projects"
ON public.procurement_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_procurement_items ppi
    JOIN public.projects p ON p.id = ppi.project_id
    WHERE ppi.id = procurement_status_history.procurement_item_id
  )
);

CREATE POLICY "Users can insert procurement history"
ON public.procurement_status_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2.3 Create procurement_documents table
CREATE TABLE IF NOT EXISTS public.procurement_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_item_id UUID NOT NULL REFERENCES public.project_procurement_items(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_procurement_documents_item 
ON public.procurement_documents(procurement_item_id);

-- Enable RLS on procurement_documents
ALTER TABLE public.procurement_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for procurement_documents
CREATE POLICY "Users can view procurement documents for their projects"
ON public.procurement_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_procurement_items ppi
    JOIN public.projects p ON p.id = ppi.project_id
    WHERE ppi.id = procurement_documents.procurement_item_id
  )
);

CREATE POLICY "Users can insert procurement documents"
ON public.procurement_documents
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete their uploaded documents"
ON public.procurement_documents
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- 2.4 Create delivery_confirmations table for contractor confirmations
CREATE TABLE IF NOT EXISTS public.procurement_delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_item_id UUID NOT NULL REFERENCES public.project_procurement_items(id) ON DELETE CASCADE,
  confirmed_by_name TEXT NOT NULL,
  confirmed_by_email TEXT,
  confirmed_by_company TEXT,
  confirmation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  condition_status TEXT DEFAULT 'good',
  condition_notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procurement_delivery_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow public insert for contractor portal (token-based)
CREATE POLICY "Anyone can view delivery confirmations"
ON public.procurement_delivery_confirmations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert delivery confirmations"
ON public.procurement_delivery_confirmations
FOR INSERT
WITH CHECK (true);

-- 2.5 Create trigger function to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_procurement_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.procurement_status_history (
      procurement_item_id,
      previous_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on project_procurement_items
DROP TRIGGER IF EXISTS trigger_log_procurement_status ON public.project_procurement_items;
CREATE TRIGGER trigger_log_procurement_status
AFTER UPDATE ON public.project_procurement_items
FOR EACH ROW
EXECUTE FUNCTION public.log_procurement_status_change();

-- Add index for category and priority filtering
CREATE INDEX IF NOT EXISTS idx_procurement_items_category 
ON public.project_procurement_items(category);

CREATE INDEX IF NOT EXISTS idx_procurement_items_priority 
ON public.project_procurement_items(priority);