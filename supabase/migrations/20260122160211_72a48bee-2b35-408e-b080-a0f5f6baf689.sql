-- Create validation function for cable entries
CREATE OR REPLACE FUNCTION public.validate_cable_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Reject empty or placeholder cable tags
  IF NEW.cable_tag IS NULL OR 
     NEW.cable_tag = '' OR 
     NEW.cable_tag = '?-?' OR
     NEW.cable_tag = 'Feeder' OR
     NEW.cable_tag LIKE ': %' OR
     NEW.cable_tag LIKE '%→%' THEN
    RAISE EXCEPTION 'Invalid cable tag: must be a properly formatted tag (e.g., "Main Board-Shop 1-Alu-25mm")';
  END IF;

  -- Reject empty from_location
  IF NEW.from_location IS NULL OR TRIM(NEW.from_location) = '' THEN
    RAISE EXCEPTION 'From location is required';
  END IF;

  -- Reject empty to_location  
  IF NEW.to_location IS NULL OR TRIM(NEW.to_location) = '' THEN
    RAISE EXCEPTION 'To location is required';
  END IF;

  -- Reject external lighting circuits in LV cable schedules (OL = Outside Lighting)
  IF NEW.to_location ~* '^ol[0-9]*$' THEN
    RAISE EXCEPTION 'External lighting circuits (OL) should not be added to LV cable schedules';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to validate on insert and update
CREATE TRIGGER validate_cable_entry_trigger
  BEFORE INSERT OR UPDATE ON public.cable_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cable_entry();