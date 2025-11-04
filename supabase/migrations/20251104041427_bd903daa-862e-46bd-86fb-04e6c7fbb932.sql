-- Fix the log_tenant_change function to use a valid notification type
CREATE OR REPLACE FUNCTION public.log_tenant_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Send notification to project members using valid notification type
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
    'status_update',
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
$function$;