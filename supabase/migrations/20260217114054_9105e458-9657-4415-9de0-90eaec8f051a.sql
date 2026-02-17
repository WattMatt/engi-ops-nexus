
-- Add missing fields to generator_settings for diesel/maintenance/operational cost calculations
ALTER TABLE public.generator_settings 
  ADD COLUMN IF NOT EXISTS diesel_cost_per_litre numeric DEFAULT 23.00,
  ADD COLUMN IF NOT EXISTS running_hours_per_month numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS maintenance_cost_annual numeric DEFAULT 18800,
  ADD COLUMN IF NOT EXISTS power_factor numeric DEFAULT 0.95,
  ADD COLUMN IF NOT EXISTS running_load_percentage numeric DEFAULT 75,
  ADD COLUMN IF NOT EXISTS maintenance_contingency_percent numeric DEFAULT 10;
