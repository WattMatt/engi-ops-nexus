ALTER TABLE generator_settings ADD COLUMN IF NOT EXISTS derate_factor numeric(4,3);
UPDATE generator_settings SET derate_factor = 0.82 WHERE derate_factor IS NULL;
ALTER TABLE generator_settings ALTER COLUMN derate_factor SET NOT NULL, ALTER COLUMN derate_factor SET DEFAULT 0.82;
ALTER TABLE generator_settings DROP CONSTRAINT IF EXISTS generator_settings_derate_factor_range;
ALTER TABLE generator_settings ADD CONSTRAINT generator_settings_derate_factor_range CHECK (derate_factor > 0 AND derate_factor <= 1);
COMMENT ON COLUMN generator_settings.derate_factor IS 'Usable-capacity factor applied to nameplate kVA (e.g. 0.82 = 18% derate). System Usable kVA = systemCapacityKva * derate_factor.';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS excluded_from_load boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN tenants.excluded_from_load IS 'Generator report soft exclusion. When true the tenant kW is removed from the system load total and rental is billed at R 0. Distinct from own_generator. Rendered greyed/strikethrough in the report.';
CREATE INDEX IF NOT EXISTS idx_tenants_excluded_from_load ON tenants(excluded_from_load) WHERE excluded_from_load = true;

NOTIFY pgrst, 'reload schema';