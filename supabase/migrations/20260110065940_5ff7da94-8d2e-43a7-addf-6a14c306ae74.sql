-- Drop the redundant trigger that also tries to calculate costs
DROP TRIGGER IF EXISTS calculate_boq_costs_trigger ON public.boq_items;

-- Update the main trigger function to respect explicitly provided total_amount values
CREATE OR REPLACE FUNCTION public.calculate_boq_item_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_amount NUMERIC;
BEGIN
  -- Always calculate these derived fields
  NEW.total_rate := COALESCE(NEW.supply_rate, 0) + COALESCE(NEW.install_rate, 0);
  NEW.supply_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.supply_rate, 0);
  NEW.install_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.install_rate, 0);
  
  -- Only calculate total_amount if NOT explicitly provided
  -- This allows imports to set exact amounts from Excel (lump sums, etc.)
  IF NEW.total_amount IS NULL OR NEW.total_amount = 0 THEN
    CASE NEW.item_type
      WHEN 'quantity' THEN
        NEW.total_amount := NEW.supply_cost + NEW.install_cost;
      WHEN 'prime_cost' THEN
        NEW.total_amount := COALESCE(NEW.prime_cost_amount, 0);
      WHEN 'percentage' THEN
        IF NEW.reference_item_id IS NOT NULL THEN
          SELECT total_amount INTO ref_amount FROM public.boq_items WHERE id = NEW.reference_item_id;
          NEW.total_amount := COALESCE(ref_amount, 0) * (COALESCE(NEW.percentage_value, 0) / 100);
        ELSE
          NEW.total_amount := 0;
        END IF;
      WHEN 'sub_header' THEN
        NEW.total_amount := 0;
      ELSE
        NEW.total_amount := NEW.supply_cost + NEW.install_cost;
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$function$;