-- Add relationship between floor plan cables and cable schedule entries
-- This allows the same cable to be referenced in both the floor plan markup and cable schedules

-- Add a foreign key column to link floor plan cables to cable schedule entries
ALTER TABLE floor_plan_cables
ADD COLUMN cable_entry_id uuid REFERENCES cable_entries(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_floor_plan_cables_cable_entry_id ON floor_plan_cables(cable_entry_id);

-- Add a column to cable_entries to optionally store the floor plan cable reference
ALTER TABLE cable_entries
ADD COLUMN floor_plan_cable_id uuid REFERENCES floor_plan_cables(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_cable_entries_floor_plan_cable_id ON cable_entries(floor_plan_cable_id);

-- Add helpful comments
COMMENT ON COLUMN floor_plan_cables.cable_entry_id IS 'Links this floor plan cable to a cable schedule entry';
COMMENT ON COLUMN cable_entries.floor_plan_cable_id IS 'Links this cable schedule entry to a floor plan cable markup';