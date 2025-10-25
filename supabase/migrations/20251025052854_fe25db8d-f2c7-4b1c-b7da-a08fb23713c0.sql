-- Create invoice_settings table for company invoicing details
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'WATSON MATTHEUS CONSULTING ELECTRICAL ENGINEERS (PTY) LTD',
  company_reg_no TEXT,
  vat_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_address TEXT,
  phone TEXT,
  cell TEXT,
  email TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_no TEXT,
  bank_branch_code TEXT,
  bank_account_name TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoice_projects table
CREATE TABLE IF NOT EXISTS public.invoice_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_vat_number TEXT,
  client_address TEXT,
  agreed_fee NUMERIC(15, 2) NOT NULL,
  total_invoiced NUMERIC(15, 2) DEFAULT 0,
  outstanding_amount NUMERIC(15, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create invoices table for progress payments
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.invoice_projects(id) ON DELETE CASCADE,
  claim_number INTEGER NOT NULL,
  invoice_date DATE NOT NULL,
  previously_invoiced NUMERIC(15, 2) DEFAULT 0,
  current_amount NUMERIC(15, 2) NOT NULL,
  vat_amount NUMERIC(15, 2) NOT NULL,
  total_amount NUMERIC(15, 2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  payment_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create monthly_payments table to track payment schedule
CREATE TABLE IF NOT EXISTS public.monthly_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.invoice_projects(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_settings
CREATE POLICY "Anyone can view invoice settings"
  ON public.invoice_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage invoice settings"
  ON public.invoice_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for invoice_projects
CREATE POLICY "Users can view invoice projects"
  ON public.invoice_projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage invoice projects"
  ON public.invoice_projects FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for monthly_payments
CREATE POLICY "Users can view monthly payments"
  ON public.monthly_payments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage monthly payments"
  ON public.monthly_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_monthly_payments_project_id ON public.monthly_payments(project_id);
CREATE INDEX idx_monthly_payments_payment_month ON public.monthly_payments(payment_month);

-- Create trigger for updated_at
CREATE TRIGGER update_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_projects_updated_at
  BEFORE UPDATE ON public.invoice_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default invoice settings
INSERT INTO public.invoice_settings (
  company_name,
  company_reg_no,
  vat_number,
  address_line1,
  address_line2,
  postal_address,
  phone,
  cell,
  email,
  bank_name,
  bank_branch,
  bank_account_no,
  bank_branch_code,
  bank_account_name
) VALUES (
  'WATSON MATTHEUS CONSULTING ELECTRICAL ENGINEERS (PTY) LTD',
  '2001/024973/07',
  '44 901 997 44',
  'Suite 1A, Ground Floor, Hazel Close, 141 Witch-Hazel Avenue',
  'Highveld Techno Park, Centurion',
  'P.O. Box 101269, Moreleta Plaza, 0167',
  '(012) 665 3487',
  '(082) 551 1616 - (082) 922 4177',
  'admin@wmeng.co.za',
  'FNB',
  'MENLYN',
  '62443071288',
  '252445',
  'Watson Mattheus Consulting Electrical Engineers (Pty) Ltd'
) ON CONFLICT DO NOTHING;