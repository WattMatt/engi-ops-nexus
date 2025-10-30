-- Drop existing invoices table if it exists
DROP TABLE IF EXISTS public.invoices CASCADE;

-- Create a clean invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  client_name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  project_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to manage their data
CREATE POLICY "Authenticated users can view all invoices"
  ON public.invoices
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert invoices"
  ON public.invoices
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoices"
  ON public.invoices
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete invoices"
  ON public.invoices
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create index for faster queries by date
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();