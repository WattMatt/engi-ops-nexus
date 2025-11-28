-- Add project_id to link invoices to projects
ALTER TABLE public.invoice_history 
ADD COLUMN project_id UUID REFERENCES public.invoice_projects(id) ON DELETE SET NULL;

-- Create index for efficient project queries
CREATE INDEX idx_invoice_history_project ON public.invoice_history(project_id);