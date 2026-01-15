-- Drop existing restrictive policies on final_account_bills
DROP POLICY IF EXISTS "Users can view bills for their final accounts" ON final_account_bills;
DROP POLICY IF EXISTS "Users can create bills for their final accounts" ON final_account_bills;
DROP POLICY IF EXISTS "Users can update bills for their final accounts" ON final_account_bills;
DROP POLICY IF EXISTS "Users can delete bills for their final accounts" ON final_account_bills;

-- Create new permissive policy for final_account_bills
CREATE POLICY "auth_full_access" ON final_account_bills
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Drop existing restrictive policies on final_account_sections
DROP POLICY IF EXISTS "Users can view sections for their bills" ON final_account_sections;
DROP POLICY IF EXISTS "Users can create sections for their bills" ON final_account_sections;
DROP POLICY IF EXISTS "Users can update sections for their bills" ON final_account_sections;
DROP POLICY IF EXISTS "Users can delete sections for their bills" ON final_account_sections;

-- Create new permissive policy for final_account_sections
CREATE POLICY "auth_full_access" ON final_account_sections
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Drop existing restrictive policies on final_account_items
DROP POLICY IF EXISTS "Users can view items for their sections" ON final_account_items;
DROP POLICY IF EXISTS "Users can create items for their sections" ON final_account_items;
DROP POLICY IF EXISTS "Users can update items for their sections" ON final_account_items;
DROP POLICY IF EXISTS "Users can delete items for their sections" ON final_account_items;

-- Create new permissive policy for final_account_items
CREATE POLICY "auth_full_access" ON final_account_items
FOR ALL TO authenticated
USING (true) WITH CHECK (true);