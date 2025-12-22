-- Create history table for final account items
CREATE TABLE public.final_account_item_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.final_account_items(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted')),
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT
);

-- Enable RLS
ALTER TABLE public.final_account_item_history ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing history (users who can see items can see history)
CREATE POLICY "Users can view item history"
ON public.final_account_item_history
FOR SELECT
USING (true);

-- Create policy for inserting history (system/triggers)
CREATE POLICY "System can insert history"
ON public.final_account_item_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_item_history_item_id ON public.final_account_item_history(item_id);
CREATE INDEX idx_item_history_changed_at ON public.final_account_item_history(changed_at DESC);

-- Create trigger function to log changes
CREATE OR REPLACE FUNCTION public.log_final_account_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  change_summary_text TEXT;
  changed_fields TEXT[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO final_account_item_history (item_id, action_type, changed_by, old_values, new_values, change_summary)
    VALUES (NEW.id, 'created', auth.uid(), NULL, to_jsonb(NEW), 'Item created: ' || COALESCE(NEW.item_code, 'N/A'));
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Build change summary
    changed_fields := ARRAY[]::TEXT[];
    
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      changed_fields := array_append(changed_fields, 'description');
    END IF;
    IF OLD.contract_quantity IS DISTINCT FROM NEW.contract_quantity THEN
      changed_fields := array_append(changed_fields, 'contract_qty');
    END IF;
    IF OLD.final_quantity IS DISTINCT FROM NEW.final_quantity THEN
      changed_fields := array_append(changed_fields, 'final_qty');
    END IF;
    IF OLD.supply_rate IS DISTINCT FROM NEW.supply_rate THEN
      changed_fields := array_append(changed_fields, 'supply_rate');
    END IF;
    IF OLD.install_rate IS DISTINCT FROM NEW.install_rate THEN
      changed_fields := array_append(changed_fields, 'install_rate');
    END IF;
    IF OLD.contract_amount IS DISTINCT FROM NEW.contract_amount THEN
      changed_fields := array_append(changed_fields, 'contract_amt');
    END IF;
    IF OLD.final_amount IS DISTINCT FROM NEW.final_amount THEN
      changed_fields := array_append(changed_fields, 'final_amt');
    END IF;
    IF OLD.pc_actual_cost IS DISTINCT FROM NEW.pc_actual_cost THEN
      changed_fields := array_append(changed_fields, 'pc_actual_cost');
    END IF;
    
    IF array_length(changed_fields, 1) > 0 THEN
      change_summary_text := 'Updated: ' || array_to_string(changed_fields, ', ');
      
      INSERT INTO final_account_item_history (item_id, action_type, changed_by, old_values, new_values, change_summary)
      VALUES (NEW.id, 'updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW), change_summary_text);
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO final_account_item_history (item_id, action_type, changed_by, old_values, new_values, change_summary)
    VALUES (OLD.id, 'deleted', auth.uid(), to_jsonb(OLD), NULL, 'Item deleted: ' || COALESCE(OLD.item_code, 'N/A'));
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create the trigger
CREATE TRIGGER log_item_changes
AFTER INSERT OR UPDATE OR DELETE ON public.final_account_items
FOR EACH ROW
EXECUTE FUNCTION public.log_final_account_item_change();