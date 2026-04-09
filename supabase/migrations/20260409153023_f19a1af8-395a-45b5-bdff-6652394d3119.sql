ALTER TABLE tenant_evaluations
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_db_position_indicated_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_db_distance_from_water_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_floor_points_indicated_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_floor_points_dimensioned_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_electrical_power_indicated_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_electrical_points_legend_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_electrical_points_dimensioned_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_lighting_indicated_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_ceiling_height_indicated_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_fittings_in_schedule_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_light_switch_position_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_signage_outlet_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_tdp_mechanical_ventilation_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_sow_db_size_visible_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_sow_db_position_confirmed_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_sow_power_points_visible_check,
  DROP CONSTRAINT IF EXISTS tenant_evaluations_sow_lighting_responsibility_check;

ALTER TABLE tenant_evaluations
  ALTER COLUMN evaluation_date TYPE TEXT;