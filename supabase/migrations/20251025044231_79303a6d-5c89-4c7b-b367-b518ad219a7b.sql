-- Delete the orphaned test employees
DELETE FROM employees WHERE employee_number IN ('EM001', 'EM003');

-- Create a function to get the next employee number
CREATE OR REPLACE FUNCTION get_next_employee_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_number TEXT;
  next_num INTEGER;
BEGIN
  SELECT employee_number INTO last_number
  FROM employees
  ORDER BY employee_number DESC
  LIMIT 1;
  
  IF last_number IS NULL THEN
    RETURN 'EM001';
  END IF;
  
  -- Extract number from last employee number (e.g., "EM001" -> 1)
  next_num := (regexp_match(last_number, '\d+$'))[1]::INTEGER + 1;
  
  RETURN 'EM' || LPAD(next_num::TEXT, 3, '0');
END;
$$;