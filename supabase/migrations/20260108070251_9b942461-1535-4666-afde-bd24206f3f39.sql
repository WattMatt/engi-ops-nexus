-- First drop the dependent trigger
DROP TRIGGER IF EXISTS update_percentage_items_trigger ON public.boq_items;

-- Now drop the generated columns and recreate as regular columns
ALTER TABLE public.boq_items DROP COLUMN IF EXISTS total_rate;
ALTER TABLE public.boq_items DROP COLUMN IF EXISTS supply_cost;
ALTER TABLE public.boq_items DROP COLUMN IF EXISTS install_cost;
ALTER TABLE public.boq_items DROP COLUMN IF EXISTS total_amount;

-- Recreate as regular columns with defaults
ALTER TABLE public.boq_items ADD COLUMN total_rate numeric DEFAULT 0;
ALTER TABLE public.boq_items ADD COLUMN supply_cost numeric DEFAULT 0;
ALTER TABLE public.boq_items ADD COLUMN install_cost numeric DEFAULT 0;
ALTER TABLE public.boq_items ADD COLUMN total_amount numeric DEFAULT 0;

-- Create a trigger to auto-calculate these values when rates/quantity change
-- but allow override when total_amount is explicitly provided
CREATE OR REPLACE FUNCTION public.calculate_boq_item_costs()
RETURNS TRIGGER AS $$
BEGIN
  -- Always calculate total_rate
  NEW.total_rate := COALESCE(NEW.supply_rate, 0) + COALESCE(NEW.install_rate, 0);
  
  -- Always calculate supply_cost and install_cost
  NEW.supply_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.supply_rate, 0);
  NEW.install_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.install_rate, 0);
  
  -- Only auto-calculate total_amount if not explicitly provided (or if 0)
  -- This allows imports to set exact amounts from Excel
  IF NEW.total_amount IS NULL OR NEW.total_amount = 0 THEN
    NEW.total_amount := COALESCE(NEW.quantity, 0) * NEW.total_rate;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS calculate_boq_costs_trigger ON public.boq_items;
CREATE TRIGGER calculate_boq_costs_trigger
  BEFORE INSERT OR UPDATE ON public.boq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_boq_item_costs();