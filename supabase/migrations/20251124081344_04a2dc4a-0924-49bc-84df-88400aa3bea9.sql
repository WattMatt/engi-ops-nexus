-- Add RLS policies for tenant_floor_plan_zones table
CREATE POLICY "auth_full_access" ON tenant_floor_plan_zones
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE tenant_floor_plan_zones ENABLE ROW LEVEL SECURITY;