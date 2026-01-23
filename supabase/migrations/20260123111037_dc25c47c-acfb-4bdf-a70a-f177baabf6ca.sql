-- Fix the trigger to use correct column names from cost_variations table
-- The table has 'amount' not 'net_total'
CREATE OR REPLACE FUNCTION public.log_variation_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.cost_variation_history (
      variation_id,
      action_type,
      old_values,
      new_values,
      changed_by,
      change_summary
    ) VALUES (
      NULL,
      'delete',
      jsonb_build_object(
        'code', OLD.code,
        'description', OLD.description,
        'tenant_id', OLD.tenant_id,
        'amount', OLD.amount,
        'is_credit', OLD.is_credit
      ),
      NULL,
      auth.uid(),
      'Variation deleted: ' || OLD.code
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.cost_variation_history (
      variation_id,
      action_type,
      old_values,
      new_values,
      changed_by,
      change_summary
    ) VALUES (
      NEW.id,
      'update',
      jsonb_build_object(
        'code', OLD.code,
        'description', OLD.description,
        'tenant_id', OLD.tenant_id,
        'amount', OLD.amount,
        'is_credit', OLD.is_credit
      ),
      jsonb_build_object(
        'code', NEW.code,
        'description', NEW.description,
        'tenant_id', NEW.tenant_id,
        'amount', NEW.amount,
        'is_credit', NEW.is_credit
      ),
      auth.uid(),
      'Variation updated: ' || NEW.code
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.cost_variation_history (
      variation_id,
      action_type,
      old_values,
      new_values,
      changed_by,
      change_summary
    ) VALUES (
      NEW.id,
      'insert',
      NULL,
      jsonb_build_object(
        'code', NEW.code,
        'description', NEW.description,
        'tenant_id', NEW.tenant_id,
        'amount', NEW.amount,
        'is_credit', NEW.is_credit
      ),
      auth.uid(),
      'Variation created: ' || NEW.code
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;