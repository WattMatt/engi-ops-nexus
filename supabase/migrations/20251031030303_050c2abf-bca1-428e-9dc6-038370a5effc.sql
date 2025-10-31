-- Drop the current check constraint
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS valid_shop_category;

-- Update categories back to original values
UPDATE tenants SET shop_category = 'national' WHERE shop_category = 'anchor';
UPDATE tenants SET shop_category = 'restaurant' WHERE shop_category = 'non-standard';

-- Add check constraint with all 4 categories
ALTER TABLE tenants ADD CONSTRAINT valid_shop_category 
CHECK (shop_category IN ('standard', 'fast_food', 'restaurant', 'national'));