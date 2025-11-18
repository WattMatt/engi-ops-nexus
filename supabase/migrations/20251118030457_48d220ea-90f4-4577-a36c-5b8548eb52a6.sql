-- Create table for project-specific calculation settings
CREATE TABLE IF NOT EXISTS cable_calculation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Voltage drop limits
  voltage_drop_limit_400v DECIMAL(4,2) DEFAULT 5.0,
  voltage_drop_limit_230v DECIMAL(4,2) DEFAULT 3.0,
  
  -- Default power factors
  power_factor_power DECIMAL(3,2) DEFAULT 0.85,
  power_factor_lighting DECIMAL(3,2) DEFAULT 0.95,
  power_factor_motor DECIMAL(3,2) DEFAULT 0.80,
  power_factor_hvac DECIMAL(3,2) DEFAULT 0.85,
  
  -- Derating factors
  ambient_temp_baseline INTEGER DEFAULT 30,
  derating_temp_correction JSONB DEFAULT '{"35": 0.96, "40": 0.91, "45": 0.87, "50": 0.82}'::jsonb,
  grouping_factor_2_circuits DECIMAL(3,2) DEFAULT 0.80,
  grouping_factor_3_circuits DECIMAL(3,2) DEFAULT 0.70,
  grouping_factor_4plus_circuits DECIMAL(3,2) DEFAULT 0.65,
  thermal_insulation_factor_default DECIMAL(3,2) DEFAULT 1.0,
  
  -- Safety margins
  cable_safety_margin DECIMAL(3,2) DEFAULT 1.15,
  max_amps_per_cable INTEGER DEFAULT 400,
  preferred_amps_per_cable INTEGER DEFAULT 300,
  
  -- Short circuit constants
  k_factor_copper INTEGER DEFAULT 115,
  k_factor_aluminium INTEGER DEFAULT 76,
  
  -- Calculation standard
  calculation_standard TEXT DEFAULT 'SANS 10142-1',
  
  -- Installation defaults
  default_installation_method TEXT DEFAULT 'air',
  default_cable_material TEXT DEFAULT 'Aluminium',
  default_insulation_type TEXT DEFAULT 'PVC',
  default_core_configuration TEXT DEFAULT '3-core',
  
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE cable_calculation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view calculation settings for their project"
  ON cable_calculation_settings FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calculation settings for their project"
  ON cable_calculation_settings FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calculation settings for their project"
  ON cable_calculation_settings FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_cable_calculation_settings_updated_at
  BEFORE UPDATE ON cable_calculation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cable_calculation_settings IS 'Project-specific calculation parameters for cable sizing';
COMMENT ON COLUMN cable_calculation_settings.voltage_drop_limit_400v IS 'Maximum voltage drop percentage for 400V circuits';
COMMENT ON COLUMN cable_calculation_settings.cable_safety_margin IS 'Safety margin multiplier (e.g., 1.15 = 15% margin)';
COMMENT ON COLUMN cable_calculation_settings.k_factor_copper IS 'Short circuit constant k for copper (typically 115)';
COMMENT ON COLUMN cable_calculation_settings.k_factor_aluminium IS 'Short circuit constant k for aluminium (typically 76)';