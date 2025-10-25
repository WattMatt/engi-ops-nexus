-- Add staff ID number field to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS staff_id_number TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS secondary_email TEXT;

-- Add comments for clarity
COMMENT ON COLUMN employees.staff_id_number IS 'National ID, passport, or other government-issued ID number';
COMMENT ON COLUMN employees.secondary_phone IS 'Secondary contact phone number';
COMMENT ON COLUMN employees.secondary_email IS 'Secondary contact email address';