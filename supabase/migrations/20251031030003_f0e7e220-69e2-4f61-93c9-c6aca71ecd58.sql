-- Drop the old check constraint
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS valid_shop_category;

-- Update existing categories to match the new values BEFORE adding constraint
UPDATE tenants SET shop_category = 'anchor' WHERE shop_category = 'national';
UPDATE tenants SET shop_category = 'non-standard' WHERE shop_category IN ('fast_food', 'restaurant');

-- Now add new check constraint with the correct categories
ALTER TABLE tenants ADD CONSTRAINT valid_shop_category 
CHECK (shop_category IN ('standard', 'non-standard', 'anchor'));