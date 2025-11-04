
-- Add floor_plan_id to cable_entries to link cables directly to floor plans
-- This allows cables to be created from either the cable schedule OR the floor plan
-- and appear in both places without duplication

ALTER TABLE cable_entries
ADD COLUMN IF NOT EXISTS created_from TEXT DEFAULT 'schedule' CHECK (created_from IN ('schedule', 'floor_plan'));

-- Make schedule_id nullable so cables created from floor plan don't need a schedule initially
ALTER TABLE cable_entries
ALTER COLUMN schedule_id DROP NOT NULL;

-- Add index for floor_plan_cable_id lookups
CREATE INDEX IF NOT EXISTS idx_cable_entries_floor_plan_cable_id 
ON cable_entries(floor_plan_cable_id);

-- Update existing cable entries to have created_from set based on whether they have floor_plan_cable_id
UPDATE cable_entries
SET created_from = CASE 
  WHEN floor_plan_cable_id IS NOT NULL THEN 'floor_plan'
  ELSE 'schedule'
END
WHERE created_from = 'schedule';
