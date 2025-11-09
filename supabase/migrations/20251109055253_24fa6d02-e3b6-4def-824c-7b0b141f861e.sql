-- Add capital recovery parameters to generator_settings
ALTER TABLE public.generator_settings
ADD COLUMN IF NOT EXISTS capital_recovery_period_years integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS capital_recovery_rate_percent numeric(5,2) DEFAULT 12.00;