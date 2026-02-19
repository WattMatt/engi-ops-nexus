
-- Allow anonymous contractors with valid tokens to UPDATE procurement items
-- This is needed for contractors to save order dates, expected delivery dates, supplier info etc.
CREATE POLICY "Anon contractor update procurement items"
  ON public.project_procurement_items
  FOR UPDATE
  TO anon
  USING (has_valid_contractor_portal_token(project_id))
  WITH CHECK (has_valid_contractor_portal_token(project_id));

-- Also ensure anon can INSERT delivery confirmations
-- Check if policy already exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'procurement_delivery_confirmations' 
    AND policyname = 'Anon contractor insert delivery confirmations'
  ) THEN
    EXECUTE 'CREATE POLICY "Anon contractor insert delivery confirmations"
      ON public.procurement_delivery_confirmations
      FOR INSERT
      TO anon
      WITH CHECK (EXISTS (
        SELECT 1 FROM project_procurement_items ppi
        JOIN contractor_portal_tokens cpt ON cpt.project_id = ppi.project_id
        WHERE ppi.id = procurement_item_id
          AND cpt.is_active = true
          AND cpt.expires_at > now()
      ))';
  END IF;
END $$;
