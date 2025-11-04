
-- Add floor_plan_id to cable_entries so cables created in floor plan can reference their source
ALTER TABLE cable_entries
ADD COLUMN IF NOT EXISTS floor_plan_id uuid REFERENCES floor_plan_projects(id) ON DELETE CASCADE;

-- Create index for floor_plan_id lookups
CREATE INDEX IF NOT EXISTS idx_cable_entries_floor_plan_id 
ON cable_entries(floor_plan_id);

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view cable entries in their schedules" ON cable_entries;
DROP POLICY IF EXISTS "Users can insert cable entries in their schedules" ON cable_entries;
DROP POLICY IF EXISTS "Users can update cable entries in their schedules" ON cable_entries;
DROP POLICY IF EXISTS "Users can delete cable entries in their schedules" ON cable_entries;

-- Create new comprehensive policies that cover both schedules and floor plans
CREATE POLICY "Users can view cable entries from schedules or floor plans"
ON cable_entries FOR SELECT
USING (
  -- Via schedule
  (schedule_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM cable_schedules cs
    JOIN project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = cable_entries.schedule_id AND pm.user_id = auth.uid()
  ))
  OR
  -- Via floor plan
  (floor_plan_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM floor_plan_projects fp
    WHERE fp.id = cable_entries.floor_plan_id AND fp.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create cable entries from schedules or floor plans"
ON cable_entries FOR INSERT
WITH CHECK (
  -- Via schedule
  (schedule_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM cable_schedules cs
    JOIN project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = cable_entries.schedule_id AND pm.user_id = auth.uid()
  ))
  OR
  -- Via floor plan
  (floor_plan_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM floor_plan_projects fp
    WHERE fp.id = cable_entries.floor_plan_id AND fp.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can update cable entries from schedules or floor plans"
ON cable_entries FOR UPDATE
USING (
  -- Via schedule
  (schedule_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM cable_schedules cs
    JOIN project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = cable_entries.schedule_id AND pm.user_id = auth.uid()
  ))
  OR
  -- Via floor plan
  (floor_plan_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM floor_plan_projects fp
    WHERE fp.id = cable_entries.floor_plan_id AND fp.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete cable entries from schedules or floor plans"
ON cable_entries FOR DELETE
USING (
  -- Via schedule
  (schedule_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM cable_schedules cs
    JOIN project_members pm ON pm.project_id = cs.project_id
    WHERE cs.id = cable_entries.schedule_id AND pm.user_id = auth.uid()
  ))
  OR
  -- Via floor plan
  (floor_plan_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM floor_plan_projects fp
    WHERE fp.id = cable_entries.floor_plan_id AND fp.user_id = auth.uid()
  ))
);
