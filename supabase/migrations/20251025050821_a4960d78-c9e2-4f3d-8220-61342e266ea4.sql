-- Fix RLS policies for company_settings
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;

-- Create policy that allows admins to do everything
CREATE POLICY "Admins can manage company settings"
ON company_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure there's at least one row in the table
INSERT INTO company_settings (company_name, company_tagline)
SELECT 'WM Consulting', 'Engineering Operations Platform'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);