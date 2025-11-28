-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_payroll BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly expenses table (for both actuals and forecasts)
CREATE TABLE public.monthly_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  expense_month DATE NOT NULL,
  budgeted_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC DEFAULT NULL,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, expense_month)
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_categories
CREATE POLICY "Authenticated users can view expense categories"
ON public.expense_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage expense categories"
ON public.expense_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for monthly_expenses
CREATE POLICY "Authenticated users can view monthly expenses"
ON public.monthly_expenses FOR SELECT
USING (true);

CREATE POLICY "Admins can manage monthly expenses"
ON public.monthly_expenses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default expense categories
INSERT INTO public.expense_categories (name, code, description, is_payroll, display_order) VALUES
  ('Salaries & Wages', 'SALARY', 'Employee salaries and wages', true, 1),
  ('Benefits & Insurance', 'BENEFITS', 'Employee benefits, medical aid, insurance', true, 2),
  ('Rent & Utilities', 'RENT', 'Office rent, electricity, water', false, 3),
  ('Professional Services', 'PROF_SERVICES', 'Legal, accounting, consulting fees', false, 4),
  ('Software & Technology', 'TECH', 'Software subscriptions, IT equipment', false, 5),
  ('Marketing & Advertising', 'MARKETING', 'Marketing campaigns, advertising', false, 6),
  ('Travel & Entertainment', 'TRAVEL', 'Business travel, client entertainment', false, 7),
  ('Office Supplies', 'SUPPLIES', 'Stationery, consumables', false, 8),
  ('Other Expenses', 'OTHER', 'Miscellaneous expenses', false, 9);

-- Create trigger for updated_at
CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_expenses_updated_at
BEFORE UPDATE ON public.monthly_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();