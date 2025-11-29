-- Add vat_amount column for proper financial accounting
ALTER TABLE invoice_history 
ADD COLUMN IF NOT EXISTS vat_amount numeric;

-- Update existing records to calculate VAT (15%) from the amounts
-- If we have both excl and incl, calculate the difference
-- Otherwise calculate 15% VAT
UPDATE invoice_history 
SET vat_amount = 
  CASE 
    WHEN amount_excl_vat IS NOT NULL AND amount_incl_vat IS NOT NULL 
      THEN ROUND((amount_incl_vat - amount_excl_vat)::numeric, 2)
    WHEN amount_incl_vat IS NOT NULL 
      THEN ROUND((amount_incl_vat * 0.15 / 1.15)::numeric, 2)
    WHEN amount_excl_vat IS NOT NULL 
      THEN ROUND((amount_excl_vat * 0.15)::numeric, 2)
    ELSE NULL
  END
WHERE vat_amount IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN invoice_history.vat_amount IS 'VAT amount at 15% - for South African financial reporting';