-- Fix the trigger to NOT reference the deleted variation_id on DELETE operations
-- This prevents the FK violation when logging deletion events

CREATE OR REPLACE FUNCTION public.log_variation_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- On DELETE, insert with NULL variation_id to avoid FK constraint violation
    INSERT INTO public.cost_variation_history (
      variation_id,
      change_type,
      previous_values,
      new_values,
      changed_by
    ) VALUES (
      NULL,  -- Use NULL instead of OLD.id since the record is being deleted
      'delete',
      jsonb_build_object(
        'code', OLD.code,
        'description', OLD.description,
        'tenant_id', OLD.tenant_id,
        'net_total', OLD.net_total
      ),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.cost_variation_history (
      variation_id,
      change_type,
      previous_values,
      new_values,
      changed_by
    ) VALUES (
      NEW.id,
      'update',
      jsonb_build_object(
        'code', OLD.code,
        'description', OLD.description,
        'tenant_id', OLD.tenant_id,
        'net_total', OLD.net_total
      ),
      jsonb_build_object(
        'code', NEW.code,
        'description', NEW.description,
        'tenant_id', NEW.tenant_id,
        'net_total', NEW.net_total
      ),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.cost_variation_history (
      variation_id,
      change_type,
      previous_values,
      new_values,
      changed_by
    ) VALUES (
      NEW.id,
      'insert',
      NULL,
      jsonb_build_object(
        'code', NEW.code,
        'description', NEW.description,
        'tenant_id', NEW.tenant_id,
        'net_total', NEW.net_total
      ),
      auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;