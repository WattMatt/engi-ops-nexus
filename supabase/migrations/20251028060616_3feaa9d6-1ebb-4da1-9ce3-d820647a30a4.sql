-- Create zones table if it doesn't exist
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id uuid NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  zone_type text NOT NULL,
  points jsonb NOT NULL,
  name text,
  color text,
  area_sqm numeric,
  roof_pitch integer,
  roof_azimuth integer,
  created_at timestamptz DEFAULT now()
);

-- Create containment_routes table if it doesn't exist  
CREATE TABLE IF NOT EXISTS containment_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id uuid NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  route_type text NOT NULL,
  points jsonb NOT NULL,
  size text,
  length_meters numeric,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE containment_routes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view zones in their floor plans" ON zones;
DROP POLICY IF EXISTS "Users can manage zones in their floor plans" ON zones;
DROP POLICY IF EXISTS "Users can view containment in their floor plans" ON containment_routes;
DROP POLICY IF EXISTS "Users can manage containment in their floor plans" ON containment_routes;

-- Create RLS policies for zones
CREATE POLICY "Users can view zones in their floor plans"
  ON zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      JOIN project_members pm ON pm.project_id = fp.project_id
      WHERE fp.id = zones.floor_plan_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage zones in their floor plans"
  ON zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      JOIN project_members pm ON pm.project_id = fp.project_id
      WHERE fp.id = zones.floor_plan_id AND pm.user_id = auth.uid()
    )
  );

-- Create RLS policies for containment_routes
CREATE POLICY "Users can view containment in their floor plans"
  ON containment_routes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      JOIN project_members pm ON pm.project_id = fp.project_id
      WHERE fp.id = containment_routes.floor_plan_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage containment in their floor plans"
  ON containment_routes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM floor_plans fp
      JOIN project_members pm ON pm.project_id = fp.project_id
      WHERE fp.id = containment_routes.floor_plan_id AND pm.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_zones_floor_plan ON zones(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_containment_routes_floor_plan ON containment_routes(floor_plan_id);