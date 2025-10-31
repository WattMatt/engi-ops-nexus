-- Create tenant floor plan masks table
CREATE TABLE IF NOT EXISTS tenant_floor_plan_masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  tenant_id UUID,
  shop_number TEXT NOT NULL,
  points JSONB NOT NULL,
  area NUMERIC NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tenant_floor_plan_masks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view floor plan masks for their projects"
  ON tenant_floor_plan_masks
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create floor plan masks for their projects"
  ON tenant_floor_plan_masks
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update floor plan masks for their projects"
  ON tenant_floor_plan_masks
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete floor plan masks for their projects"
  ON tenant_floor_plan_masks
  FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Add index
CREATE INDEX idx_tenant_floor_plan_masks_project_id ON tenant_floor_plan_masks(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_floor_plan_masks_updated_at
  BEFORE UPDATE ON tenant_floor_plan_masks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();