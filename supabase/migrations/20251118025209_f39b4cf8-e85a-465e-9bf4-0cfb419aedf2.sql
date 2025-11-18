-- Add electrical engineering parameters to cable_entries
ALTER TABLE cable_entries 
ADD COLUMN IF NOT EXISTS power_factor DECIMAL(3,2) DEFAULT 0.85,
ADD COLUMN IF NOT EXISTS ambient_temperature INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS grouping_factor DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS thermal_insulation_factor DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS voltage_drop_limit DECIMAL(4,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS circuit_type TEXT DEFAULT 'power',
ADD COLUMN IF NOT EXISTS number_of_phases INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS core_configuration TEXT DEFAULT '3-core',
ADD COLUMN IF NOT EXISTS protection_device_rating DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS max_demand_factor DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS starting_current DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS fault_level DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS earth_fault_loop_impedance DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS calculation_method TEXT DEFAULT 'SANS 10142-1',
ADD COLUMN IF NOT EXISTS insulation_type TEXT DEFAULT 'PVC';

COMMENT ON COLUMN cable_entries.power_factor IS 'Power factor (0.0-1.0) for voltage drop calculations';
COMMENT ON COLUMN cable_entries.ambient_temperature IS 'Ambient temperature in °C for derating';
COMMENT ON COLUMN cable_entries.grouping_factor IS 'Derating factor for grouped cables';
COMMENT ON COLUMN cable_entries.thermal_insulation_factor IS 'Derating factor for thermal insulation';
COMMENT ON COLUMN cable_entries.voltage_drop_limit IS 'Maximum allowable voltage drop in %';
COMMENT ON COLUMN cable_entries.circuit_type IS 'Type: power, lighting, motor, hvac, etc.';
COMMENT ON COLUMN cable_entries.number_of_phases IS 'Number of phases: 1 or 3';
COMMENT ON COLUMN cable_entries.core_configuration IS 'Cable core configuration: 3-core, 4-core, single-core';
COMMENT ON COLUMN cable_entries.protection_device_rating IS 'Overcurrent protection device rating in Amps';
COMMENT ON COLUMN cable_entries.max_demand_factor IS 'Maximum demand factor for load diversity';
COMMENT ON COLUMN cable_entries.starting_current IS 'Motor starting current in Amps if applicable';
COMMENT ON COLUMN cable_entries.fault_level IS 'Prospective short circuit current in kA';
COMMENT ON COLUMN cable_entries.earth_fault_loop_impedance IS 'Earth fault loop impedance in Ω';
COMMENT ON COLUMN cable_entries.calculation_method IS 'Standard used: SANS 10142-1, IEC 60364, etc.';
COMMENT ON COLUMN cable_entries.insulation_type IS 'Insulation material: PVC, XLPE, EPR';