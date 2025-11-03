-- Add termination cost fields to cable_rates table
ALTER TABLE cable_rates
ADD COLUMN termination_cost_per_end numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN cable_rates.termination_cost_per_end IS 'Cost per termination (typically 2 per cable run - one at each end)';