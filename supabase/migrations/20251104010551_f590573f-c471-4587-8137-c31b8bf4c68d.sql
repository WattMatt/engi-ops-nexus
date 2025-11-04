-- Create tenant schedule versions table to track overall tenant data changes
CREATE TABLE IF NOT EXISTS tenant_schedule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, version_number)
);

-- Create tenant change audit log to track individual changes
CREATE TABLE IF NOT EXISTS tenant_change_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES tenant_schedule_versions(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  changed_fields JSONB, -- Store what fields changed
  old_values JSONB, -- Store old values
  new_values JSONB, -- Store new values
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add tenant schedule version tracking to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- Add tenant schedule version reference to generator reports
ALTER TABLE generator_reports
ADD COLUMN IF NOT EXISTS tenant_schedule_version INTEGER;

-- Create function to get current tenant schedule version
CREATE OR REPLACE FUNCTION get_current_tenant_schedule_version(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0)
  INTO current_version
  FROM tenant_schedule_versions
  WHERE project_id = p_project_id;
  
  RETURN current_version;
END;
$$;

-- Create function to increment tenant schedule version
CREATE OR REPLACE FUNCTION increment_tenant_schedule_version(p_project_id UUID, p_change_summary TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_version_id UUID;
  current_version INTEGER;
BEGIN
  current_version := get_current_tenant_schedule_version(p_project_id);
  
  INSERT INTO tenant_schedule_versions (project_id, version_number, change_summary, changed_by)
  VALUES (p_project_id, current_version + 1, p_change_summary, auth.uid())
  RETURNING id INTO new_version_id;
  
  RETURN new_version_id;
END;
$$;

-- Create function to log tenant change
CREATE OR REPLACE FUNCTION log_tenant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  version_id UUID;
  change_type TEXT;
  changed_fields JSONB;
  old_vals JSONB;
  new_vals JSONB;
BEGIN
  -- Determine change type
  IF TG_OP = 'INSERT' THEN
    change_type := 'created';
    new_vals := to_jsonb(NEW);
    old_vals := NULL;
    changed_fields := jsonb_object_keys(to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    change_type := 'updated';
    new_vals := to_jsonb(NEW);
    old_vals := to_jsonb(OLD);
    
    -- Determine which fields changed
    changed_fields := jsonb_build_object(
      'changed_fields', 
      (SELECT jsonb_agg(key) 
       FROM jsonb_each(to_jsonb(NEW)) 
       WHERE to_jsonb(NEW) -> key != to_jsonb(OLD) -> key)
    );
  ELSIF TG_OP = 'DELETE' THEN
    change_type := 'deleted';
    old_vals := to_jsonb(OLD);
    new_vals := NULL;
    changed_fields := NULL;
  END IF;

  -- Create new version
  version_id := increment_tenant_schedule_version(
    COALESCE(NEW.project_id, OLD.project_id),
    format('Tenant %s: %s', COALESCE(NEW.shop_number, OLD.shop_number), change_type)
  );

  -- Log the change
  INSERT INTO tenant_change_audit_log (
    project_id,
    version_id,
    tenant_id,
    change_type,
    changed_fields,
    old_values,
    new_values,
    changed_by
  ) VALUES (
    COALESCE(NEW.project_id, OLD.project_id),
    version_id,
    COALESCE(NEW.id, OLD.id),
    change_type,
    changed_fields,
    old_vals,
    new_vals,
    auth.uid()
  );

  -- Update last modified timestamp
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    NEW.last_modified_at := now();
    NEW.last_modified_by := auth.uid();
  END IF;

  -- Send notification to project members
  INSERT INTO status_notifications (
    user_id,
    notification_type,
    title,
    description,
    link,
    metadata
  )
  SELECT 
    pm.user_id,
    'tenant_data_changed',
    'Tenant Schedule Updated',
    format('Tenant data has been modified. Reports may need regenerating. Change: %s', change_type),
    '/dashboard/tenant-tracker',
    jsonb_build_object(
      'project_id', COALESCE(NEW.project_id, OLD.project_id),
      'tenant_id', COALESCE(NEW.id, OLD.id),
      'change_type', change_type,
      'version_id', version_id
    )
  FROM project_members pm
  WHERE pm.project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND pm.user_id != auth.uid(); -- Don't notify the user who made the change

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for tenant changes
DROP TRIGGER IF EXISTS tenant_change_tracking_trigger ON tenants;
CREATE TRIGGER tenant_change_tracking_trigger
AFTER INSERT OR UPDATE OR DELETE ON tenants
FOR EACH ROW
EXECUTE FUNCTION log_tenant_change();

-- Enable RLS on new tables
ALTER TABLE tenant_schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_change_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_schedule_versions
CREATE POLICY "Users can view versions for their projects"
ON tenant_schedule_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tenant_schedule_versions.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- RLS policies for tenant_change_audit_log
CREATE POLICY "Users can view audit logs for their projects"
ON tenant_change_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = tenant_change_audit_log.project_id
    AND project_members.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_tenant_schedule_versions_project ON tenant_schedule_versions(project_id, version_number DESC);
CREATE INDEX idx_tenant_change_audit_log_project ON tenant_change_audit_log(project_id, changed_at DESC);
CREATE INDEX idx_tenant_change_audit_log_version ON tenant_change_audit_log(version_id);
CREATE INDEX idx_tenants_last_modified ON tenants(project_id, last_modified_at DESC);