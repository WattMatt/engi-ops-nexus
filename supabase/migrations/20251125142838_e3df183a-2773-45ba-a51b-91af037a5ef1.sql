-- Add fields for dynamic parallel cable tracking
ALTER TABLE cable_entries 
ADD COLUMN IF NOT EXISTS parallel_group_id uuid,
ADD COLUMN IF NOT EXISTS base_cable_tag text;

-- Create index for performance when querying parallel groups
CREATE INDEX IF NOT EXISTS idx_cable_entries_parallel_group 
ON cable_entries(parallel_group_id) 
WHERE parallel_group_id IS NOT NULL;

-- Populate base_cable_tag from existing cable_tag (remove parallel numbers)
-- This handles tags like "MINI SUB 1-MAIN BOARD 1.1 (3/5) (2/2)" -> "MINI SUB 1-MAIN BOARD 1.1"
UPDATE cable_entries 
SET base_cable_tag = regexp_replace(cable_tag, '\s*\(\d+/\d+\)(\s*\(\d+/\d+\))*\s*$', '')
WHERE base_cable_tag IS NULL;