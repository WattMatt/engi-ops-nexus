-- Add building calculation type to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS building_calculation_type TEXT DEFAULT 'commercial' CHECK (building_calculation_type IN ('commercial', 'residential'));

COMMENT ON COLUMN projects.building_calculation_type IS 'Determines load calculation method: commercial uses SANS 204, residential uses SANS 10142 fitting-based approach';