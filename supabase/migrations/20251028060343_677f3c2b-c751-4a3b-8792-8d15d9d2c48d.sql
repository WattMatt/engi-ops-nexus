-- Add new columns to floor_plans table (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='floor_plans' AND column_name='design_purpose') THEN
    ALTER TABLE floor_plans ADD COLUMN design_purpose text DEFAULT 'general';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='floor_plans' AND column_name='pv_panel_config') THEN
    ALTER TABLE floor_plans ADD COLUMN pv_panel_config jsonb DEFAULT '{"length": 1.7, "width": 1.0, "wattage": 400}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='floor_plans' AND column_name='scale_info') THEN
    ALTER TABLE floor_plans ADD COLUMN scale_info jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='floor_plans' AND column_name='view_state') THEN
    ALTER TABLE floor_plans ADD COLUMN view_state jsonb DEFAULT '{"zoom": 1, "pan": {"x": 0, "y": 0}}'::jsonb;
  END IF;
END $$;

-- Create floor_plan_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS floor_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id uuid NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to text,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  linked_item_id text,
  linked_item_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE floor_plan_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view tasks in their floor plans" ON floor_plan_tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their floor plans" ON floor_plan_tasks;

CREATE POLICY "Users can view tasks in their floor plans"
  ON floor_plan_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      JOIN project_members pm ON pm.project_id = fp.project_id
      WHERE fp.id = floor_plan_tasks.floor_plan_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tasks in their floor plans"
  ON floor_plan_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      JOIN project_members pm ON pm.project_id = fp.project_id
      WHERE fp.id = floor_plan_tasks.floor_plan_id AND pm.user_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_floor_plan_tasks_floor_plan ON floor_plan_tasks(floor_plan_id);

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_floor_plan_tasks_updated_at'
  ) THEN
    CREATE TRIGGER update_floor_plan_tasks_updated_at
      BEFORE UPDATE ON floor_plan_tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;