-- Add shop_category to tenants table
ALTER TABLE tenants 
ADD COLUMN shop_category text NOT NULL DEFAULT 'standard';

-- Add category to db_sizing_rules table
ALTER TABLE db_sizing_rules
ADD COLUMN category text NOT NULL DEFAULT 'standard';

-- Add constraint to validate categories
ALTER TABLE tenants
ADD CONSTRAINT valid_shop_category CHECK (shop_category IN ('standard', 'fast_food', 'restaurant', 'national'));

ALTER TABLE db_sizing_rules
ADD CONSTRAINT valid_rule_category CHECK (category IN ('standard', 'fast_food', 'restaurant', 'national'));