-- Add field to track tenants with dedicated BOQs that should be excluded from cost totals
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS exclude_from_totals boolean DEFAULT false;

-- Add a comment explaining the field
COMMENT ON COLUMN public.tenants.exclude_from_totals IS 'If true, this tenant has a dedicated BOQ and should be excluded from lighting/DB cost totals';