-- Add electrical baseline information fields to projects table
ALTER TABLE public.projects 
ADD COLUMN primary_voltage TEXT,
ADD COLUMN connection_size TEXT,
ADD COLUMN supply_authority TEXT,
ADD COLUMN electrical_standard TEXT DEFAULT 'SANS 10142-1',
ADD COLUMN diversity_factor DECIMAL(5,2),
ADD COLUMN load_category TEXT,
ADD COLUMN tariff_structure TEXT,
ADD COLUMN metering_requirements TEXT,
ADD COLUMN protection_philosophy TEXT;

COMMENT ON COLUMN public.projects.primary_voltage IS 'Primary supply voltage (e.g., 11kV, 22kV, 33kV)';
COMMENT ON COLUMN public.projects.connection_size IS 'Expected electrical connection size (e.g., 2500kVA, 5MVA)';
COMMENT ON COLUMN public.projects.supply_authority IS 'Electrical supply authority (e.g., Eskom, City Power)';
COMMENT ON COLUMN public.projects.electrical_standard IS 'Applicable electrical standard (default SANS 10142-1)';
COMMENT ON COLUMN public.projects.diversity_factor IS 'Overall diversity factor for load calculations';
COMMENT ON COLUMN public.projects.load_category IS 'Load category (e.g., Commercial, Industrial, Residential)';
COMMENT ON COLUMN public.projects.tariff_structure IS 'Tariff structure (e.g., Megaflex, Nightsave, TOU)';
COMMENT ON COLUMN public.projects.metering_requirements IS 'Metering requirements and specifications';
COMMENT ON COLUMN public.projects.protection_philosophy IS 'Protection coordination philosophy';