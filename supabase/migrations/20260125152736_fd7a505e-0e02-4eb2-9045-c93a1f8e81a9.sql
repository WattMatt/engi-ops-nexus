-- Add load entry method tracking and method-specific data fields
ALTER TABLE public.bulk_services_documents
ADD COLUMN IF NOT EXISTS load_entry_method TEXT DEFAULT 'total',
ADD COLUMN IF NOT EXISTS load_schedule_items JSONB,
ADD COLUMN IF NOT EXISTS category_totals JSONB,
ADD COLUMN IF NOT EXISTS sans204_entries JSONB,
ADD COLUMN IF NOT EXISTS sans10142_entries JSONB,
ADD COLUMN IF NOT EXISTS admd_entries JSONB,
ADD COLUMN IF NOT EXISTS external_meter_links JSONB,
ADD COLUMN IF NOT EXISTS calculated_connected_load NUMERIC,
ADD COLUMN IF NOT EXISTS calculated_max_demand NUMERIC,
ADD COLUMN IF NOT EXISTS load_calculation_breakdown JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.bulk_services_documents.load_entry_method IS 'Method used: total, itemized, category, sans204, sans10142, admd, external';
COMMENT ON COLUMN public.bulk_services_documents.load_calculation_breakdown IS 'Detailed breakdown of load calculation for auditing';