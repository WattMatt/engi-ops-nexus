
CREATE TABLE IF NOT EXISTS tenant_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'approved')),
    evaluation_date DATE,
    evaluated_by TEXT,
    comments TEXT,
    tdp_db_position_indicated TEXT CHECK (tdp_db_position_indicated IN ('Yes', 'No', 'N/A')),
    tdp_db_distance_from_water TEXT CHECK (tdp_db_distance_from_water IN ('Yes', 'No', 'N/A')),
    tdp_floor_points_indicated TEXT CHECK (tdp_floor_points_indicated IN ('Yes', 'No', 'N/A')),
    tdp_floor_points_dimensioned TEXT CHECK (tdp_floor_points_dimensioned IN ('Yes', 'No', 'N/A')),
    tdp_electrical_power_indicated TEXT CHECK (tdp_electrical_power_indicated IN ('Yes', 'No', 'N/A')),
    tdp_electrical_points_legend TEXT CHECK (tdp_electrical_points_legend IN ('Yes', 'No', 'N/A')),
    tdp_electrical_points_dimensioned TEXT CHECK (tdp_electrical_points_dimensioned IN ('Yes', 'No', 'N/A')),
    tdp_lighting_indicated TEXT CHECK (tdp_lighting_indicated IN ('Yes', 'No', 'N/A')),
    tdp_ceiling_height_indicated TEXT CHECK (tdp_ceiling_height_indicated IN ('Yes', 'No', 'N/A')),
    tdp_fittings_in_schedule TEXT CHECK (tdp_fittings_in_schedule IN ('Yes', 'No', 'N/A')),
    tdp_light_switch_position TEXT CHECK (tdp_light_switch_position IN ('Yes', 'No', 'N/A')),
    tdp_signage_outlet TEXT CHECK (tdp_signage_outlet IN ('Yes', 'No', 'N/A')),
    tdp_mechanical_ventilation TEXT CHECK (tdp_mechanical_ventilation IN ('Yes', 'No', 'N/A')),
    sow_db_size_visible TEXT CHECK (sow_db_size_visible IN ('Yes', 'No', 'N/A')),
    sow_db_position_confirmed TEXT CHECK (sow_db_position_confirmed IN ('Yes', 'No', 'N/A')),
    sow_power_points_visible TEXT CHECK (sow_power_points_visible IN ('Yes', 'No', 'N/A')),
    sow_lighting_responsibility TEXT CHECK (sow_lighting_responsibility IN ('Yes', 'No', 'N/A')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_evaluations_project_id ON tenant_evaluations(project_id);
CREATE INDEX IF NOT EXISTS idx_tenant_evaluations_tenant_id ON tenant_evaluations(tenant_id);

ALTER TABLE tenant_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evaluations for their projects"
  ON tenant_evaluations FOR SELECT TO authenticated
  USING (public.user_has_project_access(project_id));

CREATE POLICY "Users can insert evaluations for their projects"
  ON tenant_evaluations FOR INSERT TO authenticated
  WITH CHECK (public.user_has_project_access(project_id));

CREATE POLICY "Users can update evaluations for their projects"
  ON tenant_evaluations FOR UPDATE TO authenticated
  USING (public.user_has_project_access(project_id));

CREATE POLICY "Users can delete evaluations for their projects"
  ON tenant_evaluations FOR DELETE TO authenticated
  USING (public.user_has_project_access(project_id));

CREATE TRIGGER set_tenant_evaluations_updated_at
  BEFORE UPDATE ON tenant_evaluations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
