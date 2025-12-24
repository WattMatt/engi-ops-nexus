-- Add gross_area column to shop subsections
ALTER TABLE final_account_shop_subsections 
ADD COLUMN IF NOT EXISTS gross_area NUMERIC(12,2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN final_account_shop_subsections.gross_area IS 'Gross Lettable Area (GLA) of the shop in square meters';