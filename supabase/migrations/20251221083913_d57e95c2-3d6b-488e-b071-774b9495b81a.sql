-- Add column to store the original BOQ stated total (what the document claims)
-- This is separate from contract_total which will be the calculated sum of items
ALTER TABLE public.final_account_sections 
ADD COLUMN IF NOT EXISTS boq_stated_total numeric DEFAULT 0;

-- Add a comment explaining the difference
COMMENT ON COLUMN public.final_account_sections.boq_stated_total IS 'The total as stated in the original BOQ document (may contain calculation errors)';
COMMENT ON COLUMN public.final_account_sections.contract_total IS 'The calculated total from summing individual line items';