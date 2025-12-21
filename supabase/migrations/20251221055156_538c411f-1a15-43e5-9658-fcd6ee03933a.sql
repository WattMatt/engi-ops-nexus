-- Create table to track Prime Cost items in Final Accounts
CREATE TABLE public.final_account_prime_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.final_accounts(id) ON DELETE CASCADE,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity NUMERIC DEFAULT 1,
  pc_allowance NUMERIC NOT NULL DEFAULT 0, -- BOQ allowance amount
  actual_cost NUMERIC DEFAULT 0, -- Actual cost incurred
  profit_attendance_percent NUMERIC DEFAULT 0, -- P&A percentage from BOQ
  notes TEXT,
  boq_item_id UUID, -- Reference to original BOQ item if imported
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.final_account_prime_costs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view prime costs" 
ON public.final_account_prime_costs 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create prime costs" 
ON public.final_account_prime_costs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update prime costs" 
ON public.final_account_prime_costs 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete prime costs" 
ON public.final_account_prime_costs 
FOR DELETE 
USING (true);

-- Create trigger for timestamp updates
CREATE TRIGGER update_final_account_prime_costs_updated_at
BEFORE UPDATE ON public.final_account_prime_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_final_account_prime_costs_account_id ON public.final_account_prime_costs(account_id);