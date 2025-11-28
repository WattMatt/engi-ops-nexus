-- Create table for historical invoice records
CREATE TABLE public.invoice_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  invoice_date DATE,
  invoice_month TEXT NOT NULL,
  job_name TEXT NOT NULL,
  client_details TEXT,
  vat_number TEXT,
  amount_excl_vat NUMERIC(12,2),
  amount_incl_vat NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view invoice history" 
ON public.invoice_history 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert invoice history" 
ON public.invoice_history 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoice history" 
ON public.invoice_history 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete invoice history" 
ON public.invoice_history 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create index for efficient queries
CREATE INDEX idx_invoice_history_month ON public.invoice_history(invoice_month);
CREATE INDEX idx_invoice_history_number ON public.invoice_history(invoice_number);

-- Add trigger for updated_at
CREATE TRIGGER update_invoice_history_updated_at
BEFORE UPDATE ON public.invoice_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();