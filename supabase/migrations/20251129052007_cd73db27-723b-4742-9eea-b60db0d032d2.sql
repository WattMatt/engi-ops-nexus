
-- Fix function search_path security warnings
CREATE OR REPLACE FUNCTION log_material_price_change()
RETURNS TRIGGER AS $$
DECLARE
  old_total NUMERIC;
  new_total NUMERIC;
  change_pct NUMERIC;
BEGIN
  IF (OLD.standard_supply_cost IS DISTINCT FROM NEW.standard_supply_cost) OR 
     (OLD.standard_install_cost IS DISTINCT FROM NEW.standard_install_cost) THEN
    
    old_total := COALESCE(OLD.standard_supply_cost, 0) + COALESCE(OLD.standard_install_cost, 0);
    new_total := COALESCE(NEW.standard_supply_cost, 0) + COALESCE(NEW.standard_install_cost, 0);
    
    IF old_total > 0 THEN
      change_pct := ((new_total - old_total) / old_total) * 100;
    ELSE
      change_pct := 100;
    END IF;
    
    INSERT INTO public.material_price_audit (
      material_id,
      old_supply_cost,
      new_supply_cost,
      old_install_cost,
      new_install_cost,
      change_percent,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      OLD.standard_supply_cost,
      NEW.standard_supply_cost,
      OLD.standard_install_cost,
      NEW.standard_install_cost,
      change_pct,
      auth.uid(),
      COALESCE(NEW.notes, 'Price update')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION log_rate_change()
RETURNS TRIGGER AS $$
DECLARE
  old_total NUMERIC;
  new_total NUMERIC;
  change_pct NUMERIC;
BEGIN
  IF (OLD.base_rate IS DISTINCT FROM NEW.base_rate) OR 
     (OLD.ti_rate IS DISTINCT FROM NEW.ti_rate) THEN
    
    old_total := COALESCE(OLD.base_rate, 0) + COALESCE(OLD.ti_rate, 0);
    new_total := COALESCE(NEW.base_rate, 0) + COALESCE(NEW.ti_rate, 0);
    
    IF old_total > 0 THEN
      change_pct := ((new_total - old_total) / old_total) * 100;
    ELSE
      change_pct := 100;
    END IF;
    
    INSERT INTO public.rate_change_audit (
      rate_id, old_base_rate, new_base_rate, old_ti_rate, new_ti_rate,
      change_percent, changed_by, change_reason
    ) VALUES (
      NEW.id, OLD.base_rate, NEW.base_rate, OLD.ti_rate, NEW.ti_rate,
      change_pct, auth.uid(), COALESCE(NEW.notes, 'Rate update')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_material_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.master_material_id IS NOT NULL THEN
    UPDATE public.master_materials 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.master_material_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
