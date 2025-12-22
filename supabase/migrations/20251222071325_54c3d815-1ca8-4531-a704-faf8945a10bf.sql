-- Fix foreign key constraint to allow deleting items with history
-- Change the foreign key to SET NULL on delete so history is preserved but item can be deleted
ALTER TABLE public.final_account_item_history 
DROP CONSTRAINT IF EXISTS final_account_item_history_item_id_fkey;

ALTER TABLE public.final_account_item_history 
ADD CONSTRAINT final_account_item_history_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES public.final_account_items(id) ON DELETE SET NULL;

-- Update the trigger function to handle the delete case properly
CREATE OR REPLACE FUNCTION public.log_final_account_item_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    IF OLD.unit IS DISTINCT FROM NEW.unit THEN
      changed_fields := array_append(changed_fields, 'unit');
    END IF;
    
    IF array_length(changed_fields, 1) > 0 THEN
      change_summary_text := 'Updated: ' || array_to_string(changed_fields, ', ');
      
      INSERT INTO final_account_item_history (item_id, action_type, changed_by, old_values, new_values, change_summary)
      VALUES (NEW.id, 'updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW), change_summary_text);
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- For delete, insert history BEFORE returning OLD, and set item_id to NULL since item will be gone
    INSERT INTO final_account_item_history (item_id, action_type, changed_by, old_values, new_values, change_summary)
    VALUES (NULL, 'deleted', auth.uid(), to_jsonb(OLD), NULL, 'Item deleted: ' || COALESCE(OLD.item_code, 'N/A') || ' - ' || COALESCE(OLD.description, 'N/A'));
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;