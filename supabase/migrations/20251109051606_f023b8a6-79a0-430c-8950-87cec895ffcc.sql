-- Create audit log table for kW override changes
CREATE TABLE IF NOT EXISTS public.tenant_kw_override_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  old_value NUMERIC,
  new_value NUMERIC,
  change_type TEXT NOT NULL, -- 'set', 'reset', 'update'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_kw_override_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log
CREATE POLICY "Users can view audit logs for their projects"
  ON public.tenant_kw_override_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tenant_kw_override_audit.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audit logs for their projects"
  ON public.tenant_kw_override_audit
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = tenant_kw_override_audit.project_id
      AND pm.user_id = auth.uid()
    )
    AND changed_by = auth.uid()
  );

-- Create index for faster queries
CREATE INDEX idx_tenant_kw_audit_tenant_id ON public.tenant_kw_override_audit(tenant_id);
CREATE INDEX idx_tenant_kw_audit_project_id ON public.tenant_kw_override_audit(project_id);
CREATE INDEX idx_tenant_kw_audit_changed_at ON public.tenant_kw_override_audit(changed_at DESC);

-- Create trigger function to automatically log kW override changes
CREATE OR REPLACE FUNCTION public.log_kw_override_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change_type_value TEXT;
BEGIN
  -- Only log if manual_kw_override changed
  IF (TG_OP = 'UPDATE' AND 
      (OLD.manual_kw_override IS DISTINCT FROM NEW.manual_kw_override)) THEN
    
    -- Determine change type
    IF OLD.manual_kw_override IS NULL AND NEW.manual_kw_override IS NOT NULL THEN
      change_type_value := 'set';
    ELSIF OLD.manual_kw_override IS NOT NULL AND NEW.manual_kw_override IS NULL THEN
      change_type_value := 'reset';
    ELSE
      change_type_value := 'update';
    END IF;
    
    -- Insert audit log entry
    INSERT INTO public.tenant_kw_override_audit (
      tenant_id,
      project_id,
      changed_by,
      old_value,
      new_value,
      change_type
    ) VALUES (
      NEW.id,
      NEW.project_id,
      auth.uid(),
      OLD.manual_kw_override,
      NEW.manual_kw_override,
      change_type_value
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on tenants table
CREATE TRIGGER tenant_kw_override_audit_trigger
  AFTER UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.log_kw_override_change();