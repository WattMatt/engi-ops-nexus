-- Add columns to budget_line_items for tenant linking
ALTER TABLE public.budget_line_items
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS is_tenant_item BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shop_number TEXT;

-- Add columns to electrical_budgets for source tracking
ALTER TABLE public.electrical_budgets
ADD COLUMN IF NOT EXISTS source_file_url TEXT,
ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'manual';

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_budget_line_items_tenant_id ON public.budget_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_shop_number ON public.budget_line_items(shop_number);