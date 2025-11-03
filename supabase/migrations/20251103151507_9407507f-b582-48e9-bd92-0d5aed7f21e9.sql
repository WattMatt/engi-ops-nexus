-- Add additional costing line items to generator_settings
ALTER TABLE public.generator_settings
ADD COLUMN IF NOT EXISTS num_tenant_dbs integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rate_per_tenant_db numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS num_main_boards integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS rate_per_main_board numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_cabling_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS control_wiring_cost numeric DEFAULT 0;